"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAppUser } from "@/lib/supabase/session";
import type { Density } from "@/lib/types";

async function requireCommercialOrManager() {
  const appUser = await getAppUser();
  if (!appUser || (appUser.role !== "commercial" && appUser.role !== "manager")) {
    throw new Error("Action réservée aux commerciaux et au manager.");
  }
  return appUser;
}

export type FormState = { error?: string };

const densities: Density[] = ["faible", "moyen", "fort"];

export async function createReleve(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireCommercialOrManager();

  const clientId = String(formData.get("client_id") ?? "") || null;
  const cityId = String(formData.get("city_id") ?? "");
  const troncon = String(formData.get("troncon") ?? "").trim();
  const lengthM = Number(formData.get("length_m"));
  const countAller = Number(formData.get("count_aller"));
  const countRetour = Number(formData.get("count_retour"));
  const density = String(formData.get("density") ?? "") as Density;

  if (!cityId || !troncon) {
    return { error: "Ville et nom du tronçon requis." };
  }
  if (!Number.isFinite(lengthM) || lengthM <= 0) {
    return { error: "Longueur invalide." };
  }
  if (!Number.isFinite(countAller) || countAller < 0 || !Number.isFinite(countRetour) || countRetour < 0) {
    return { error: "Nombre de déchets invalide." };
  }
  if (!densities.includes(density)) {
    return { error: "Densité requise." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("releve").insert({
    client_id: clientId,
    city_id: cityId,
    troncon,
    length_m: lengthM,
    count_aller: countAller,
    count_retour: countRetour,
    density,
  });

  if (error) {
    return { error: "Erreur lors de l'enregistrement du relevé." };
  }

  revalidatePath("/releves");
  return {};
}

export async function deleteReleve(id: string) {
  await requireCommercialOrManager();
  const supabase = await createClient();
  await supabase.from("releve").delete().eq("id", id);
  revalidatePath("/releves");
}
