"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { getAppUser } from "@/lib/supabase/session";
import type { Role } from "@/lib/roles";

async function requireManager() {
  const appUser = await getAppUser();
  if (!appUser || appUser.role !== "manager") {
    throw new Error("Action réservée au manager.");
  }
  return appUser;
}

export type FormState = { error?: string; success?: boolean };

// ---- Villes ---------------------------------------------------------------

export async function createCity(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireManager();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();

  if (!name || !code) {
    return { error: "Nom et code requis." };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("city").insert({ name, code });

  if (error) {
    if (error.code === "23505") {
      return { error: `Le code "${code}" est déjà utilisé par une autre ville.` };
    }
    return { error: "Erreur lors de la création de la ville." };
  }

  revalidatePath("/manager/villes");
  return {};
}

// ---- Opérateurs -------------------------------------------------------------

export async function createOperator(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireManager();
  const name = String(formData.get("name") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim() || null;

  if (!name) {
    return { error: "Nom requis." };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("operator").insert({ name, contact });

  if (error) {
    return { error: "Erreur lors de la création de l'opérateur." };
  }

  revalidatePath("/manager/operateurs");
  return {};
}

export async function setOperatorStatus(operatorId: string, status: "active" | "inactive") {
  await requireManager();
  const supabase = await createSupabaseClient();
  await supabase.from("operator").update({ status }).eq("id", operatorId);
  revalidatePath("/manager/operateurs");
}

// ---- Clients ----------------------------------------------------------------

export async function createClientRecord(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireManager();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "Nom requis." };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("client").insert({ name });

  if (error) {
    return { error: "Erreur lors de la création du client." };
  }

  revalidatePath("/manager/clients");
  return {};
}

// ---- Missions -----------------------------------------------------------------

export async function createMission(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireManager();
  const cityId = String(formData.get("city_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "") || null;
  const date = String(formData.get("date") ?? "");

  if (!cityId || !date) {
    return { error: "Ville et date requises." };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("mission").insert({ city_id: cityId, client_id: clientId, date });

  if (error) {
    return { error: "Erreur lors de la création de la mission." };
  }

  revalidatePath("/manager");
  return {};
}

export async function updateMission(missionId: string, _prevState: FormState, formData: FormData): Promise<FormState> {
  await requireManager();
  const cityId = String(formData.get("city_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "") || null;
  const date = String(formData.get("date") ?? "");

  if (!cityId || !date) {
    return { error: "Ville et date requises." };
  }

  const supabase = await createSupabaseClient();

  const { data: mission } = await supabase.from("mission").select("status").eq("id", missionId).single();
  if (mission?.status !== "planned") {
    return { error: "Mission déjà démarrée — modification impossible." };
  }

  const { error } = await supabase
    .from("mission")
    .update({ city_id: cityId, client_id: clientId, date })
    .eq("id", missionId);

  if (error) {
    return { error: "Erreur lors de la modification de la mission." };
  }

  revalidatePath("/manager");
  return { success: true };
}

// Ending a mission is a manager-only decision: it may run over several days
// and several operators/sessions, so no automatic trigger can know when
// it's actually done.
export async function completeMission(missionId: string) {
  await requireManager();
  const supabase = await createSupabaseClient();
  await supabase
    .from("mission")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("id", missionId);
  revalidatePath("/manager");
}

export async function setMissionAssignments(missionId: string, operatorIds: string[]) {
  await requireManager();
  const supabase = await createSupabaseClient();

  const { data: mission } = await supabase.from("mission").select("status").eq("id", missionId).single();
  // A mission can run over several days/operators, so assignment stays
  // editable while it's ongoing — only a manager-completed mission locks it.
  if (mission?.status === "completed") {
    return;
  }

  const { data: current } = await supabase
    .from("mission_assignment")
    .select("operator_id")
    .eq("mission_id", missionId);

  const currentIds = new Set((current ?? []).map((row) => row.operator_id as string));
  const nextIds = new Set(operatorIds);

  const toRemove = [...currentIds].filter((id) => !nextIds.has(id));
  const toAdd = [...nextIds].filter((id) => !currentIds.has(id));

  if (toRemove.length > 0) {
    await supabase.from("mission_assignment").delete().eq("mission_id", missionId).in("operator_id", toRemove);
  }
  if (toAdd.length > 0) {
    await supabase
      .from("mission_assignment")
      .insert(toAdd.map((operator_id) => ({ mission_id: missionId, operator_id })));
  }

  revalidatePath("/manager");
}

export async function updateMissionAssignments(missionId: string, formData: FormData) {
  const operatorIds = formData.getAll("operator_ids").map(String);
  await setMissionAssignments(missionId, operatorIds);
}

// ---- Provisioning des comptes -------------------------------------------------

export async function createAppUser(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireManager();
  const authUserId = String(formData.get("auth_user_id") ?? "").trim();
  const role = String(formData.get("role") ?? "") as Role;
  const scopeId = String(formData.get("scope_id") ?? "") || null;

  if (!authUserId || !role) {
    return { error: "Identifiant utilisateur et rôle requis." };
  }
  if (role !== "manager" && role !== "commercial" && !scopeId) {
    return { error: "Ce rôle nécessite de sélectionner l'entité associée." };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("app_user").insert({
    id: authUserId,
    role,
    operator_id: role === "operator" ? scopeId : null,
    client_id: role === "client" ? scopeId : null,
    city_id: role === "city" ? scopeId : null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Ce compte a déjà un profil ViiA Pick." };
    }
    return { error: "Erreur lors de la création du profil — vérifiez l'identifiant utilisateur." };
  }

  revalidatePath("/manager/utilisateurs");
  return {};
}

export async function updateAppUser(userId: string, _prevState: FormState, formData: FormData): Promise<FormState> {
  await requireManager();
  const role = String(formData.get("role") ?? "") as Role;
  const scopeId = String(formData.get("scope_id") ?? "") || null;

  if (!role) {
    return { error: "Rôle requis." };
  }
  if (role !== "manager" && role !== "commercial" && !scopeId) {
    return { error: "Ce rôle nécessite de sélectionner l'entité associée." };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("app_user")
    .update({
      role,
      operator_id: role === "operator" ? scopeId : null,
      client_id: role === "client" ? scopeId : null,
      city_id: role === "city" ? scopeId : null,
    })
    .eq("id", userId);

  if (error) {
    return { error: "Erreur lors de la modification du profil." };
  }

  revalidatePath("/manager/utilisateurs");
  return { success: true };
}

export async function deleteAppUser(userId: string) {
  await requireManager();
  const supabase = await createSupabaseClient();
  await supabase.from("app_user").delete().eq("id", userId);
  revalidatePath("/manager/utilisateurs");
}
