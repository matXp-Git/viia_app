import type { ClientOrder, TimeSlot } from "@/lib/types";

export const WITHIN_DAYS_OPTIONS = [7, 15, 30] as const;

export const timeSlotLabel: Record<TimeSlot, string> = {
  matin: "Matin",
  apres_midi: "Après-midi",
};

export const REMARK_MAX_LENGTH = 500;
export const MAX_STREETS = 50;

// "2026-09-28" -> "28/09/2026". String-based on purpose: going through Date
// would shift the day depending on the server/browser timezone.
export function formatDateFr(iso: string): string {
  return iso.slice(0, 10).split("-").reverse().join("/");
}

export function delayLabel(order: Pick<ClientOrder, "delay_type" | "within_days" | "target_date">): string {
  if (order.delay_type === "within_days") {
    return `Sous ${order.within_days} jours (avant le ${formatDateFr(order.target_date)})`;
  }
  return `Le ${formatDateFr(order.target_date)}`;
}

// The order/zone database functions raise short codes; turn them into
// sentences a client can act on.
const ERROR_MESSAGES: Record<string, string> = {
  forbidden: "Action non autorisée sur ce compte.",
  client_required: "Sélectionnez d'abord un client.",
  zone_not_found: "Zone introuvable.",
  zone_locked: "Cette zone est liée à une commande : elle ne peut plus être modifiée ni supprimée. Utilisez « Dupliquer » pour repartir de ses rues.",
  duplicate_name: "Vous avez déjà une zone portant ce nom.",
  invalid_name: "Le nom de la zone est requis (100 caractères maximum).",
  invalid_city: "Sélectionnez une ville.",
  no_streets: "Ajoutez au moins une rue.",
  too_many_streets: `Une zone ne peut pas dépasser ${MAX_STREETS} rues.`,
  invalid_street: "Un nom de rue est trop long (150 caractères maximum).",
  invalid_date: "Choisissez une date d'intervention à partir d'aujourd'hui.",
  invalid_delay: "Choisissez un délai d'intervention.",
  invalid_slot: "Créneau horaire invalide.",
  remark_too_long: `La remarque est limitée à ${REMARK_MAX_LENGTH} caractères.`,
  pricing_missing: "Les tarifs ne sont pas configurés — contactez ViiA.",
};

export function orderErrorMessage(rawMessage: string | undefined): string {
  if (rawMessage && ERROR_MESSAGES[rawMessage]) return ERROR_MESSAGES[rawMessage];
  return "Une erreur est survenue. Réessayez, ou contactez ViiA si elle persiste.";
}
