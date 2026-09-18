"use server";

import { revalidatePath } from "next/cache";
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

export async function addReportPhoto(reportId: string, storagePath: string, position: number) {
  await requireCommercialOrManager();
  const supabase = await createClient();
  await supabase.from("report_photo").insert({ report_id: reportId, storage_path: storagePath, position });
  revalidatePath(`/rapports/${reportId}`);
}

export async function deleteReportPhoto(photoId: string) {
  await requireCommercialOrManager();
  const supabase = await createClient();

  const { data: photo } = await supabase.from("report_photo").select("report_id, storage_path").eq("id", photoId).single();
  if (!photo) return;

  await supabase.storage.from(REPORT_PHOTOS_BUCKET).remove([photo.storage_path]);
  await supabase.from("report_photo").delete().eq("id", photoId);
  revalidatePath(`/rapports/${photo.report_id}`);
}

export async function deleteReport(reportId: string) {
  await requireCommercialOrManager();
  const supabase = await createClient();

  const { data: photos } = await supabase.from("report_photo").select("storage_path").eq("report_id", reportId);
  if (photos && photos.length > 0) {
    await supabase.storage.from(REPORT_PHOTOS_BUCKET).remove(photos.map((p) => p.storage_path));
  }
  await supabase.from("report").delete().eq("id", reportId);
  revalidatePath("/rapports");
}
