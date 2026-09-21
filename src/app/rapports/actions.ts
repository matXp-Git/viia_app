"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppUser } from "@/lib/supabase/session";
import { generateReportSlug } from "@/lib/slug";
import { REPORT_PHOTOS_BUCKET } from "@/lib/storage";

async function requireCommercialOrManager() {
  const appUser = await getAppUser();
  if (!appUser || (appUser.role !== "commercial" && appUser.role !== "manager")) {
    throw new Error("Action réservée aux commerciaux et au manager.");
  }
  return appUser;
}

export type FormState = { error?: string };

export async function createReport(_prevState: FormState, formData: FormData): Promise<FormState> {
  const appUser = await requireCommercialOrManager();
  const title = String(formData.get("title") ?? "").trim();
  const cityId = String(formData.get("city_id") ?? "") || null;
  const clientId = String(formData.get("client_id") ?? "") || null;

  if (!title) {
    return { error: "Titre requis." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report")
    .insert({ title, city_id: cityId, client_id: clientId, slug: generateReportSlug(), created_by: appUser.id })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Erreur lors de la création du rapport." };
  }

  redirect(`/rapports/${data.id}`);
}

export type SaveReportInput = {
  title: string;
  cityId: string | null;
  clientId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  releveIds: string[];
};

export async function saveReport(reportId: string, input: SaveReportInput): Promise<FormState> {
  await requireCommercialOrManager();
  if (!input.title.trim()) {
    return { error: "Titre requis." };
  }

  const supabase = await createClient();

  const { error: metaError } = await supabase
    .from("report")
    .update({
      title: input.title.trim(),
      city_id: input.cityId,
      client_id: input.clientId,
      date_from: input.dateFrom,
      date_to: input.dateTo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  if (metaError) {
    return { error: "Erreur lors de l'enregistrement du rapport." };
  }

  await supabase.from("report_releve").delete().eq("report_id", reportId);
  if (input.releveIds.length > 0) {
    await supabase.from("report_releve").insert(input.releveIds.map((releve_id) => ({ report_id: reportId, releve_id })));
  }

  revalidatePath(`/rapports/${reportId}`);
  return {};
}

export async function addReportPhoto(
  reportId: string,
  storagePath: string,
  position: number,
): Promise<{ id?: string; error?: string }> {
  await requireCommercialOrManager();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_photo")
    .insert({ report_id: reportId, storage_path: storagePath, position })
    .select("id")
    .single();
  if (error || !data) return { error: "Photo non enregistrée." };
  revalidatePath(`/rapports/${reportId}`);
  return { id: data.id as string };
}

// Removes the files and confirms they're really gone. The storage API answers
// "success" with an empty list when a delete is silently refused (a policy
// hiding the row), so success alone isn't proof.
async function removePhotoFiles(supabase: SupabaseClient, paths: string[]): Promise<boolean> {
  if (paths.length === 0) return true;
  const storage = supabase.storage.from(REPORT_PHOTOS_BUCKET);

  const { error } = await storage.remove(paths);
  if (error) return false;

  for (const path of paths) {
    const { data: stillThere, error: existsError } = await storage.exists(path);
    if (!existsError && stillThere) return false;
  }
  return true;
}

export async function deleteReportPhoto(photoId: string): Promise<{ error?: string }> {
  await requireCommercialOrManager();
  const supabase = await createClient();

  const { data: photo } = await supabase.from("report_photo").select("report_id, storage_path").eq("id", photoId).single();
  if (!photo) return { error: "Photo introuvable." };

  // File first: if it can't be erased we keep the database row, so nothing
  // is left behind that is still publicly reachable but no longer listed.
  if (!(await removePhotoFiles(supabase, [photo.storage_path]))) {
    return { error: "La photo n'a pas pu être supprimée du stockage. Réessayez." };
  }

  await supabase.from("report_photo").delete().eq("id", photoId);
  revalidatePath(`/rapports/${photo.report_id}`);
  return {};
}

export async function deleteReport(reportId: string): Promise<{ error?: string }> {
  await requireCommercialOrManager();
  const supabase = await createClient();

  const { data: photos } = await supabase.from("report_photo").select("storage_path").eq("report_id", reportId);
  if (!(await removePhotoFiles(supabase, (photos ?? []).map((p) => p.storage_path as string)))) {
    return { error: "Les photos n'ont pas pu être supprimées du stockage. Le rapport n'a pas été supprimé." };
  }

  await supabase.from("report").delete().eq("id", reportId);
  revalidatePath("/rapports");
  return {};
}
