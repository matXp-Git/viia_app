"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleHome } from "@/lib/roles";

export type LoginState = { error?: string };

export async function signIn(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email et mot de passe requis." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "Email ou mot de passe incorrect." };
  }

  const { data: appUser } = await supabase.from("app_user").select("role").eq("id", data.user.id).single();

  if (!appUser) {
    await supabase.auth.signOut();
    return { error: "Ce compte n'a pas encore de profil ViiA Pick — contactez votre manager." };
  }

  redirect(roleHome(appUser.role));
}
