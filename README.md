# ViiA Pick

Suivi de missions de collecte de déchets diffus — tracé GPS et tableaux de bord multi-acteurs.

Spec complète : [`References/viia-specs-phase1.md`](References/viia-specs-phase1.md)
Design system : [`References/viia-design-tokens.css`](References/viia-design-tokens.css) ·
[`References/viia-design-tokens.json`](References/viia-design-tokens.json) ·
[`References/viia-design-system.html`](References/viia-design-system.html)

## Stack

- **Next.js** (App Router, TypeScript)
- **Supabase** (Postgres + Auth) — schéma complet dans [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
- **MapLibre GL** + [OpenFreeMap](https://openfreemap.org/) (tuiles gratuites, sans clé) — voir `NEXT_PUBLIC_MAP_STYLE_URL`
- **Tailwind CSS v4**, thème entièrement dérivé de `References/viia-design-tokens.css` (aucune couleur/valeur en dur — voir `src/app/globals.css`)

## Démarrer

```bash
pnpm install
cp .env.local.example .env.local
```

Il faut un projet Supabase (gratuit) :

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Copier `Project URL` et `anon public key` (Project Settings → API) dans `.env.local`.
3. Appliquer le schéma : `supabase db push` (CLI Supabase) ou coller le contenu de
   `supabase/migrations/0001_init.sql` dans le SQL Editor du projet.

```bash
pnpm dev
```

## Où en est le scaffold

Fait :
- Schéma de BDD complet (§2 du cahier de specs) avec génération atomique des identifiants
  (matricule opérateur, référence mission par ville) et RLS pour le cloisonnement par rôle.
- Tokens de design branchés (Tailwind `@theme` pointant sur `References/viia-design-tokens.css`).
- Composants de base : `Button`, `StatusBadge`, `Field`, `ListRow`, `ReportCardGrid`, `Eyebrow`.
- Client Supabase (browser/server/middleware) prêt à l'emploi.
- Squelette des 3 surfaces (`/operator`, `/manager`, `/portal`) — pages vides pour l'instant.

Reste à faire (prochaines sessions) :
- Écrans d'authentification + redirection par rôle.
- Administration manager (CRUD villes/opérateurs/missions, affectation).
- PWA opérateur : liste des missions, captation GPS (`watchPosition`), segment manuel, saisie de pesée.
- Intégration MapLibre (tracés multi-couleurs, carte manager vs. carte client/ville).
- Dashboards manager et client/ville (indicateurs, filtres, appel à `get_mission_totals()`).
- Icônes d'app réelles (`public/icon.svg` est un placeholder à remplacer).
