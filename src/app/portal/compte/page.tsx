import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppUser } from "@/lib/supabase/session";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PasswordForm } from "./PasswordForm";

export default async function AccountPage() {
  const appUser = await getAppUser();
  if (!appUser) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only the record the account is attached to (a client never reads the
  // full client list).
  let attachedLabel = "Ville";
  let attachedName = "—";
  if (appUser.role === "client" && appUser.client_id) {
    const { data } = await supabase.from("client").select("name").eq("id", appUser.client_id).maybeSingle();
    attachedLabel = "Client";
    attachedName = (data as { name: string } | null)?.name ?? "—";
  } else if (appUser.city_id) {
    const { data } = await supabase.from("city").select("name").eq("id", appUser.city_id).maybeSingle();
    attachedName = (data as { name: string } | null)?.name ?? "—";
  }

  return (
    <main className="mx-auto max-w-(--container-max) px-(--gutter) py-(--space-9)">
      <Eyebrow>Mon compte</Eyebrow>
      <h1 className="mt-(--space-2) text-display-sm">Mon compte</h1>

      <div className="mt-(--space-6) grid max-w-[560px] grid-cols-2 gap-px border border-divider bg-divider max-mobile:grid-cols-1">
        <div className="bg-surface p-(--space-4)">
          <div className="text-2xs uppercase tracking-label text-muted">Adresse e-mail</div>
          <div className="mt-(--space-2) break-all text-sm font-bold text-heading">{user?.email ?? "—"}</div>
        </div>
        <div className="bg-surface p-(--space-4)">
          <div className="text-2xs uppercase tracking-label text-muted">{attachedLabel}</div>
          <div className="mt-(--space-2) text-sm font-bold text-heading">{attachedName}</div>
        </div>
      </div>

      <section className="mt-(--space-7)">
        <Eyebrow>Mot de passe</Eyebrow>
        <p className="mt-(--space-2) max-w-[62ch] text-sm text-muted">8 caractères minimum.</p>
        <div className="mt-(--space-3)">
          <PasswordForm />
        </div>
      </section>
    </main>
  );
}
