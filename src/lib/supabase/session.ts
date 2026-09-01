import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/lib/types";

// The Supabase auth session (who's signed in) plus their ViiA Pick profile
// (role + scope). Server-side only — used to guard layouts and to derive
// what a page/action is allowed to do.
export async function getAppUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("app_user").select("*").eq("id", user.id).single();
  return (data as AppUser) ?? null;
}
