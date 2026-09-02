"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAppUser } from "@/lib/supabase/session";
import type { TrackSource } from "@/lib/types";

async function requireOperator() {
  const appUser = await getAppUser();
  if (!appUser || appUser.role !== "operator" || !appUser.operator_id) {
    throw new Error("Action réservée à l'opérateur assigné.");
  }
  return appUser;
}

export type ActionResult = { error?: string; segmentId?: string };

export async function startSegment(missionId: string, source: TrackSource): Promise<ActionResult> {
  const appUser = await requireOperator();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("track_segment")
    .insert({ mission_id: missionId, operator_id: appUser.operator_id, source })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Impossible de démarrer le segment." };
  }

  revalidatePath(`/operator/missions/${missionId}`);
  return { segmentId: data.id };
}

export async function recordPoint(segmentId: string, lat: number, lng: number, recordedAt: string) {
  const supabase = await createClient();
  await supabase.from("track_point").insert({ segment_id: segmentId, lat, lng, recorded_at: recordedAt });
}

export type WeighingState = { error?: string; success?: boolean };

// Missions can span several days/sessions, so each weigh-in is its own
// record (not upserted) — otherwise a second weigh-in would silently erase
// the first one's numbers instead of adding to the mission's total.
export async function submitWeighing(
  missionId: string,
  _prevState: WeighingState,
  formData: FormData,
): Promise<WeighingState> {
  const appUser = await requireOperator();
  const supabase = await createClient();

  const kilosTotal = Number(formData.get("kilos_total"));
  const kilosRecycled = Number(formData.get("kilos_recycled"));

  if (!Number.isFinite(kilosTotal) || kilosTotal < 0) {
    return { error: "Poids total invalide." };
  }
  if (!Number.isFinite(kilosRecycled) || kilosRecycled < 0 || kilosRecycled > kilosTotal) {
    return { error: "Le poids recyclé doit être compris entre 0 et le poids total." };
  }

  const { error } = await supabase
    .from("weighing")
    .insert({ mission_id: missionId, operator_id: appUser.operator_id, kilos_total: kilosTotal, kilos_recycled: kilosRecycled });

  if (error) {
    return { error: "Erreur lors de l'enregistrement de la pesée." };
  }

  revalidatePath(`/operator/missions/${missionId}`);
  return { success: true };
}

export async function reportWildDump(missionId: string, lat: number, lng: number): Promise<ActionResult> {
  const appUser = await requireOperator();
  const supabase = await createClient();

  const { error } = await supabase
    .from("wild_dump")
    .insert({ mission_id: missionId, operator_id: appUser.operator_id, lat, lng });

  if (error) {
    return { error: "Impossible d'enregistrer le dépôt sauvage." };
  }

  revalidatePath(`/operator/missions/${missionId}`);
  return {};
}
