"use client";

import { useActionState, useState } from "react";
import { createAppUser, type FormState } from "../actions";
import type { City, Client, Operator } from "@/lib/types";
import type { Role } from "@/lib/roles";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";

const initialState: FormState = {};

type Props = {
  operators: Operator[];
  clients: Client[];
  cities: City[];
};

const roleLabel: Record<Role, string> = {
  operator: "Opérateur",
  manager: "Manager",
  client: "Client",
  city: "Ville",
  commercial: "Commercial",
};

export function CreateAppUserForm({ operators, clients, cities }: Props) {
  const [state, formAction, pending] = useActionState(createAppUser, initialState);
  const [role, setRole] = useState<Role>("operator");

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-(--space-4) border border-divider p-(--space-4)">
      <TextField
        label="ID utilisateur (Supabase Auth)"
        name="auth_user_id"
        required
        placeholder="uuid"
        className="max-w-[320px]"
      />
      <SelectField label="Rôle" name="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
        {(Object.keys(roleLabel) as Role[]).map((r) => (
          <option key={r} value={r}>
            {roleLabel[r]}
          </option>
        ))}
      </SelectField>

      {role === "operator" ? (
        <SelectField label="Opérateur" name="scope_id" required defaultValue="">
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
        <SelectField label="Client" name="scope_id" required defaultValue="">
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
        <SelectField label="Ville" name="scope_id" required defaultValue="">
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

      {state.error ? <p className="w-full text-xs text-critical">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Création..." : "Créer le profil →"}
      </Button>
    </form>
  );
}
