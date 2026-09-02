import { createClient } from "@/lib/supabase/server";
import type { AppUser, City, Client, Operator } from "@/lib/types";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CreateAppUserForm } from "./CreateAppUserForm";
import { AppUserRow } from "./AppUserRow";

export default async function UtilisateursPage() {
  const supabase = await createClient();

  const [{ data: appUsers }, { data: operators }, { data: clients }, { data: cities }] = await Promise.all([
    supabase.from("app_user").select("*"),
    supabase.from("operator").select("*").eq("status", "active").order("name"),
    supabase.from("client").select("*").order("name"),
    supabase.from("city").select("*").order("name"),
  ]);

  const users = (appUsers ?? []) as AppUser[];
  const allOperators = (operators ?? []) as Operator[];
  const allClients = (clients ?? []) as Client[];
  const allCities = (cities ?? []) as City[];

  const operatorById = new Map(allOperators.map((o) => [o.id, o]));
  const clientById = new Map(allClients.map((c) => [c.id, c]));
  const cityById = new Map(allCities.map((c) => [c.id, c]));

  function scopeName(user: AppUser) {
    if (user.role === "operator" && user.operator_id) return operatorById.get(user.operator_id)?.name ?? "?";
    if (user.role === "client" && user.client_id) return clientById.get(user.client_id)?.name ?? "?";
    if (user.role === "city" && user.city_id) return cityById.get(user.city_id)?.name ?? "?";
    return "—";
  }

  // For the create form: entities not linked to anyone yet.
  const linkedOperatorIds = new Set(users.map((u) => u.operator_id).filter(Boolean));
  const linkedClientIds = new Set(users.map((u) => u.client_id).filter(Boolean));
  const linkedCityIds = new Set(users.map((u) => u.city_id).filter(Boolean));

  const availableOperators = allOperators.filter((o) => !linkedOperatorIds.has(o.id));
  const availableClients = allClients.filter((c) => !linkedClientIds.has(c.id));
  const availableCities = allCities.filter((c) => !linkedCityIds.has(c.id));

  return (
    <div>
      <Eyebrow>Utilisateurs</Eyebrow>
      <h1 className="mt-(--space-2) text-display-sm">Comptes ViiA Pick</h1>
      <p className="mt-(--space-2) max-w-[62ch] text-sm text-body">
        Pour créer un compte : ajoutez-le d&apos;abord dans Supabase (Authentication → Add user), copiez son
        identifiant (UUID), puis liez-le ici à un rôle et à une entité. Une erreur de saisie (mauvais rôle,
        mauvaise entité) se corrige avec « Modifier », sans recréer le compte.
      </p>

      <div className="mt-(--space-6)">
        <CreateAppUserForm operators={availableOperators} clients={availableClients} cities={availableCities} />
      </div>

      <div className="mt-(--space-6) flex flex-col">
        {users.map((user) => (
          <AppUserRow
            key={user.id}
            user={user}
            scopeName={scopeName(user)}
            // For editing, an entity may keep its own current link plus pick any unlinked one.
            operators={allOperators.filter((o) => !linkedOperatorIds.has(o.id) || o.id === user.operator_id)}
            clients={allClients.filter((c) => !linkedClientIds.has(c.id) || c.id === user.client_id)}
            cities={allCities.filter((c) => !linkedCityIds.has(c.id) || c.id === user.city_id)}
          />
        ))}
        {users.length === 0 ? <p className="py-(--space-3) text-sm text-muted">Aucun compte lié.</p> : null}
      </div>
    </div>
  );
}
