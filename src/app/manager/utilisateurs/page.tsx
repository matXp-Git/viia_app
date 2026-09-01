import { createClient } from "@/lib/supabase/server";
import type { AppUser, City, Client, Operator } from "@/lib/types";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CreateAppUserForm } from "./CreateAppUserForm";

export default async function UtilisateursPage() {
  const supabase = await createClient();

  const [{ data: appUsers }, { data: operators }, { data: clients }, { data: cities }] = await Promise.all([
    supabase.from("app_user").select("*"),
    supabase.from("operator").select("*").eq("status", "active").order("name"),
    supabase.from("client").select("*").order("name"),
    supabase.from("city").select("*").order("name"),
  ]);

  const linkedOperatorIds = new Set((appUsers ?? []).map((u: AppUser) => u.operator_id).filter(Boolean));
  const linkedClientIds = new Set((appUsers ?? []).map((u: AppUser) => u.client_id).filter(Boolean));
  const linkedCityIds = new Set((appUsers ?? []).map((u: AppUser) => u.city_id).filter(Boolean));

  const operatorById = new Map(((operators ?? []) as Operator[]).map((o) => [o.id, o]));
  const clientById = new Map(((clients ?? []) as Client[]).map((c) => [c.id, c]));
  const cityById = new Map(((cities ?? []) as City[]).map((c) => [c.id, c]));

  const availableOperators = ((operators ?? []) as Operator[]).filter((o) => !linkedOperatorIds.has(o.id));
  const availableClients = ((clients ?? []) as Client[]).filter((c) => !linkedClientIds.has(c.id));
  const availableCities = ((cities ?? []) as City[]).filter((c) => !linkedCityIds.has(c.id));

  function scopeName(user: AppUser) {
    if (user.role === "operator" && user.operator_id) return operatorById.get(user.operator_id)?.name ?? "?";
    if (user.role === "client" && user.client_id) return clientById.get(user.client_id)?.name ?? "?";
    if (user.role === "city" && user.city_id) return cityById.get(user.city_id)?.name ?? "?";
    return "—";
  }

  return (
    <div>
      <Eyebrow>Utilisateurs</Eyebrow>
      <h1 className="mt-(--space-2) text-display-sm">Comptes ViiA Pick</h1>
      <p className="mt-(--space-2) max-w-[62ch] text-sm text-charcoal/85">
        Pour créer un compte : ajoutez-le d&apos;abord dans Supabase (Authentication → Add user), copiez son
        identifiant (UUID), puis liez-le ici à un rôle et à une entité.
      </p>

      <div className="mt-(--space-6)">
        <CreateAppUserForm operators={availableOperators} clients={availableClients} cities={availableCities} />
      </div>

      <div className="mt-(--space-6) flex flex-col">
        {((appUsers ?? []) as AppUser[]).map((user) => (
          <div key={user.id} className="flex items-center justify-between gap-(--space-4) border-t border-line py-(--space-3) last:border-b">
            <span className="text-xs text-charcoal/60">{user.id}</span>
            <span className="text-sm text-black">{scopeName(user)}</span>
            <span className="text-xs uppercase tracking-label text-charcoal/60">{user.role}</span>
          </div>
        ))}
        {(appUsers ?? []).length === 0 ? <p className="py-(--space-3) text-sm text-charcoal/60">Aucun compte lié.</p> : null}
      </div>
    </div>
  );
}
