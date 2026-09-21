"use server";

import { createClient } from "@/lib/supabase/server";
import { getAppUser } from "@/lib/supabase/session";

export type PasswordState = { error?: string; success?: boolean };

export async function updatePassword(_prevState: PasswordState, formData: FormData): Promise<PasswordState> {
  const appUser = await getAppUser();
  if (!appUser) return { error: "Session expirée — reconnectez-vous." };

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }
  if (password !== confirm) {
    return { error: "Les deux mots de passe ne correspondent pas." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (/different/i.test(error.message)) {
      return { error: "Choisissez un mot de passe différent de l'actuel." };
    }
    return { error: "Le mot de passe n'a pas pu être modifié. Réessayez." };
  }

  return { success: true };
}
