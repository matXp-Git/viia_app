import type { Density } from "@/lib/types";

// Starting thresholds — nothing in the brief specified exact cutoffs, these
// are a reasonable default the commercial team can override per relevé
// (the density field always stays editable, this only pre-fills it).
const FAIBLE_MAX = 0.5;
const MOYEN_MAX = 1.5;

export function densityPerMeter(countAller: number, countRetour: number, lengthM: number): number | null {
  if (!Number.isFinite(lengthM) || lengthM <= 0) return null;
  return (countAller + countRetour) / lengthM;
}

export function suggestDensity(perMeter: number | null): Density | null {
  if (perMeter === null) return null;
  if (perMeter < FAIBLE_MAX) return "faible";
  if (perMeter < MOYEN_MAX) return "moyen";
  return "fort";
}

export const densityLabel: Record<Density, string> = {
  faible: "Faible",
  moyen: "Moyen",
  fort: "Fort",
};
