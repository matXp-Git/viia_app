# ViiA Pick — Cahier de specs Phase 1

**Objet :** application de suivi de missions de collecte de déchets diffus avec tracé GPS type Strava et tableaux de bord multi-acteurs.
**Destinataire :** implémentation par Claude Code.
**Périmètre :** Phase 1 (MVP). Les évolutions Phase 2 sont signalées mais **hors périmètre d'implémentation**.

---

## 1. Contexte et principe

Un opérateur ViiA réalise une mission de collecte (ex. `LB1234`). Un mobile fixé dans le véhicule, écran allumé et alimentation continue, enregistre le tracé GPS pendant toute la mission. En fin de mission, l'opérateur pèse ses bacs et saisit les kilos collectés. Les tableaux de bord restituent, par mission et en total jour : le tracé parcouru affiché en ligne sur une carte (façon Strava), le total de déchets et la part recyclée.

**Contrainte structurante :** on affiche la **polyline GPS brute** sur le fond de carte. Aucune correspondance nominale avec les rues (pas de map-matching). Seul l'espace visualisé sur le plan importe.

---

## 2. Modèle de données

### Mission
| Champ | Type | Note |
|---|---|---|
| `id` | uuid | identifiant interne |
| `reference` | string | **générée** : code ville + n° incrémental par ville, ex. `LB-00001` (Lambersart). Affichée à l'opérateur |
| `client_id` | uuid (FK) | client rattaché |
| `city_id` | uuid (FK) | ville / collectivité rattachée (porte le code, ex. `LB`) |
| `date` | date | jour de la mission |
| `status` | enum | `planned` / `in_progress` / `completed` |
| `started_at` | datetime nullable | horodatage démarrage (au premier démarrage opérateur) |
| `ended_at` | datetime nullable | horodatage fin |

> **Plus de `operator_id` sur la mission** : l'affectation passe par la table `MissionAssignment` (une mission → un ou plusieurs opérateurs).

### MissionAssignment (affectation)
Lie une mission à un ou plusieurs opérateurs.
| Champ | Type | Note |
|---|---|---|
| `id` | uuid | |
| `mission_id` | uuid (FK) | |
| `operator_id` | uuid (FK) | |

> Chaque opérateur affecté produit ses **propres** segments GPS et sa **propre** pesée (cf. TrackSegment et Weighing). Côté client/ville, tout est **agrégé au niveau mission** : jamais de rendu individualisé par opérateur. Le détail par opérateur reste réservé au manager.

### City (ville / collectivité)
| Champ | Type | Note |
|---|---|---|
| `id` | uuid | |
| `name` | string | ex. Lambersart |
| `code` | string | **saisi à la création**, **unique — unicité contrôlée, doublon rejeté**, ex. `LB` — sert de préfixe aux références de mission |

### Operator (opérateur)
| Champ | Type | Note |
|---|---|---|
| `id` | uuid | |
| `matricule` | string | **généré** à la création, unique, format `OP-00001` incrémental |
| `name` | string | |
| `contact` | string | téléphone / e-mail |
| `status` | enum | `active` / `inactive` — désactivation, jamais de suppression dure |

### TrackSegment (segment de tracé)
Rattaché à une mission. Une mission a un ou plusieurs segments.
| Champ | Type | Note |
|---|---|---|
| `id` | uuid | |
| `mission_id` | uuid (FK) | |
| `operator_id` | uuid (FK) | opérateur ayant produit le segment |
| `source` | enum | `vehicle` / `manual` — **présent dès la Phase 1** même si tout est `vehicle` au début |
| `points` | array | suite ordonnée de `{lat, lng, timestamp}` |

> Le champ `source` est l'articulation qui rendra l'ajout du suivi à-pied (Phase 2) indolore : on ajoutera alors une source `tracker` sans toucher au reste.

### Weighing (pesée)
Une pesée **par opérateur et par mission**, saisie par l'opérateur en fin de sa mission.
| Champ | Type | Note |
|---|---|---|
| `id` | uuid | |
| `mission_id` | uuid (FK) | |
| `operator_id` | uuid (FK) | opérateur ayant pesé |
| `kilos_total` | decimal | total collecté par cet opérateur |
| `kilos_recycled` | decimal | part orientée recyclage |
| `recorded_at` | datetime | |

> **Règle d'agrégation :** aucun calcul de répartition. Chaque pesée porte ses propres kilos. Total mission = somme des pesées de ses opérateurs ; total jour = somme des pesées du jour. Le taux de recyclage = `kilos_recycled / kilos_total` sur le périmètre agrégé. Le client/la ville ne voit que les totaux **mission** ; le manager peut descendre au détail par opérateur.

### Acteurs (auth)
- `Operator` — opérateur terrain
- `Manager` — supervision interne ViiA
- `Client` — cloisonné à ses propres missions/zones
- `City` — cloisonné à ses propres missions/zones

Cloisonnement obligatoire : un client/une ville ne voit **que** les missions qui le/la concernent.

---

## 3. Les trois surfaces

### 3.0 Administration (manager) — en amont des tournées
Écritures réservées au rôle manager.

**Villes :** créer une ville (`name` + `code` unique, ex. `LB`). **Le code est contrôlé à la saisie : un doublon est rejeté avec message** (contrainte d'unicité en base + validation formulaire). Le code sert de préfixe aux références de mission.

**Opérateurs :** créer un opérateur (nom, contact) → **matricule généré** `OP-00001` incrémental, statut `active`. Lister, éditer, désactiver (jamais de suppression dure : un opérateur `inactive` conserve son historique).

**Missions :** créer une mission → **référence générée** `code_ville + n° incrémental par ville` (ex. `LB-00001`). Renseigner client, ville, date. **Affecter à un ou plusieurs opérateurs** (via `MissionAssignment`). Édition possible tant que la mission est `planned`.

> **Génération des identifiants incrémentaux (matricule `OP-00001` et référence mission `LB-00001`) :** la génération doit être **atomique / concurrente-safe** — deux créations simultanées ne doivent jamais produire le même numéro. À implémenter via séquence en base, contrainte d'unicité, ou transaction verrouillante (au choix selon la stack), et non par un « max + 1 » lu puis écrit sans verrou. Le compteur de mission est **par ville**.

### 3.1 App opérateur (PWA, mobile véhicule)
Contexte d'exécution : écran allumé en permanence, appareil branché. Pas de background tracking à gérer en Phase 1.

Parcours :
1. **Connexion** opérateur.
2. **Liste des missions du jour** qui lui sont assignées (référence, client, ville, statut).
3. **Démarrer la mission** `LB-00001` → si premier opérateur à démarrer, mission en `in_progress` et `started_at` posé ; ouverture d'un segment `vehicle` pour **cet** opérateur, enregistrement des points GPS à intervalle régulier (cf. §4).
4. **Bouton « segment manuel »** : marque une portion faite à pied. En Phase 1 = ouverture d'un segment `manual` sans exigence de tracé fin (le bouton signale l'existence de la portion ; le tracé peut rester grossier). Pas de complexité batterie introduite.
5. **Terminer sa part de mission** → clôture des segments de l'opérateur. `ended_at` de la mission posé et statut `completed` quand **tous** les opérateurs affectés ont terminé.
6. **Saisie de la pesée** : `kilos_total` et `kilos_recycled` propres à l'opérateur. Validation avant clôture de sa part.

### 3.2 Dashboard manager
- Liste des missions (jour / semaine) avec statut, opérateurs affectés, client, ville.
- **Carte interactive** des tracés (toutes missions du périmètre sélectionné), lignes ViiA superposables.
- Indicateurs agrégés : **total kilos**, **total kilos recyclés**, **taux de recyclage**.
- **Détail par opérateur** accessible (tracés et pesées individuels) — réservé au manager.
- Filtres : par opérateur, par ville/client, par période.

### 3.3 Dashboard client / ville
- Vue épurée, cloisonnée aux seules missions du client/de la ville.
- **Carte interactive** des zones couvertes (lignes ViiA) sur la période.
- Indicateurs : **total déchets ramassés**, **part recyclée**, **taux de recyclage**.
- Agrégation en total jour (et sélecteur de période).

---

## 4. Contrat cartographique et GPS

- **Captation GPS :** Geolocation API du navigateur (`watchPosition`), enregistrement d'un point à intervalle régulier (paramétrable, valeur de départ suggérée : toutes les 3 à 5 secondes). Filtrage des points aberrants (précision GPS insuffisante) côté client avant envoi.
- **Stockage :** points bruts en base, rattachés à leur segment.
- **Rendu :** **MapLibre GL** (open-source, sans coût à l'usage). Chaque segment est dessiné en polyline. Plusieurs tracés colorés doivent pouvoir se superposer proprement sur la même carte.
- **Couleur de tracé :** la ligne ViiA (jaune) est prise **dans les tokens du design system**, pas en dur.
- **Pas de map-matching.** On ne rattache pas les points aux rues. On affiche l'espace parcouru, rien de plus.
- **Fond de carte :** style MapLibre au choix (un fournisseur de tuiles gratuit convient pour le MVP).

---

## 5. Design system

Le design system sera **fourni avec le projet**. Forme idéale pour Claude Code :
- **Tokens** : couleurs (dont le jaune ViiA du tracé), typographie, espacements, rayons.
- **Composants de base** : boutons, cartes, champs de formulaire.
- Si issu de Figma : export des tokens en **variables CSS** (ou équivalent consommable) pour un branchement direct.

La couleur de la polyline et l'ensemble des surfaces (app + dashboards) doivent référencer ces tokens, sans valeurs codées en dur.

---

## 6. Ce que Claude Code doit produire (check-list Phase 1)

- [ ] Schéma de base de données conforme au §2 (City avec `code`, Operator avec `matricule`/`status`, Mission avec `reference` générée, MissionAssignment, TrackSegment avec `source` + `operator_id`, Weighing par opérateur, auth cloisonnée).
- [ ] Authentification et cloisonnement par rôle (opérateur / manager / client / ville).
- [ ] Administration manager : CRUD villes (`code` **unique, doublon rejeté**), création/édition/désactivation opérateurs (**matricule généré** `OP-00001`), création/édition missions (**référence générée** `LB-00001`, incrément par ville) + affectation multi-opérateurs. **Génération des identifiants atomique / concurrente-safe** (séquence ou verrou, pas de « max + 1 » non protégé).
- [ ] PWA opérateur : liste missions, démarrage/fin, captation GPS écran allumé, bouton segment manuel, saisie pesée.
- [ ] Enregistrement et persistance des points GPS par segment.
- [ ] Dashboard manager : carte multi-tracés + total kilos + total recyclés + taux + filtres.
- [ ] Dashboard client/ville : carte cloisonnée + indicateurs agrégés jour/période.
- [ ] Intégration MapLibre GL avec rendu polyline et couleur issue des tokens.
- [ ] Agrégations (total jour, taux de recyclage) comme sommes de pesées, sans répartition.
- [ ] Branchement du design system fourni (tokens + composants), aucune couleur en dur.

---

## 7. Hors périmètre Phase 1 (à anticiper, pas à implémenter)

- Suivi à-pied précis via tracker GPS dédié (source `tracker`) rechargé sur dock véhicule.
- Tracking en arrière-plan / écran verrouillé (impliquerait un passage en app native).
- Découpage secteur par secteur (la donnée étant déjà au niveau mission, ce sera une dimension de regroupement à ajouter, sans refonte du modèle).
- Facturation au kilomètre à partir des distances de tracé.

---

*Fin du cahier de specs Phase 1.*
