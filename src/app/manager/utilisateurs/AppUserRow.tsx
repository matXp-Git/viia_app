"use client";

import { useState, useTransition } from "react";
import type { AppUser, City, Client, Operator } from "@/lib/types";
import type { Role } from "@/lib/roles";
import { updateAppUser, deleteAppUser } from "../actions";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";

const roleLabel: Record<Role, string> = {
  operator: "Opérateur",
  manager: "Manager",
  client: "Client",
  city: "Ville",
};

type Props = {
  user: AppUser;
  scopeName: string;
  operators: Operator[];
  clients: Client[];
  cities: City[];
};

export function AppUserRow({ user, scopeName, operators, clients, cities }: Props) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState<Role>(user.role);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await updateAppUser(user.id, {}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  }

  function handleDelete() {
    if (!confirm("Retirer le profil ViiA Pick de ce compte ? Le compte Supabase Auth n'est pas supprimé.")) return;
    startTransition(() => deleteAppUser(user.id));
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-(--space-4) border-t border-divider py-(--space-3) last:border-b">
        <span className="text-xs text-muted">{user.id}</span>
        <span className="text-sm text-heading">{scopeName}</span>
        <span className="text-xs uppercase tracking-label text-muted">{user.role}</span>
        <div className="flex items-center gap-(--space-3)">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs uppercase tracking-label text-muted underline decoration-divider underline-offset-2 focus-ring hover:text-heading"
          >
            Modifier
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="text-xs uppercase tracking-label text-critical focus-ring disabled:opacity-40"
          >
            Retirer
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-(--space-4) border-t border-divider py-(--space-4) last:border-b"
    >
      <span className="text-xs text-muted">{user.id}</span>
      <SelectField label="Rôle" value={role} onChange={(e) => setRole(e.target.value as Role)} name="role">
        {(Object.keys(roleLabel) as Role[]).map((r) => (
          <option key={r} value={r}>
            {roleLabel[r]}
          </option>
        ))}
      </SelectField>

      {role === "operator" ? (
        <SelectField label="Opérateur" name="scope_id" required defaultValue={user.operator_id ?? ""}>
          <option value="" disabled>
            Choisir...
          </option>
          {operators.map((op) => (
            <option key={op.id} value={op.id}>
              {op.name} ({op.matricule})
            </option>
          ))}
        </SelectField>
      ) : null}
      {role === "client" ? (
        <SelectField label="Client" name="scope_id" required defaultValue={user.client_id ?? ""}>
          <option value="" disabled>
            Choisir...
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
      ) : null}
      {role === "city" ? (
        <SelectField label="Ville" name="scope_id" required defaultValue={user.city_id ?? ""}>
          <option value="" disabled>
            Choisir...
          </option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
      ) : null}

      {error ? <p className="w-full text-xs text-critical">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement..." : "Enregistrer →"}
      </Button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-xs uppercase tracking-label text-muted focus-ring hover:text-heading"
      >
        Annuler
      </button>
    </form>
  );
}
