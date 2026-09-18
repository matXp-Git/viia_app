"use client";

import { useActionState } from "react";
import { createReport, type FormState } from "./actions";
import type { City, Client } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";

const initialState: FormState = {};

type Props = {
  cities: City[];
  clients: Client[];
};

export function CreateReportForm({ cities, clients }: Props) {
  const [state, formAction, pending] = useActionState(createReport, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-(--space-4) border border-divider p-(--space-4)">
      <TextField label="Titre du rapport" name="title" required placeholder="Prospect X — secteur..." className="max-w-[320px]" />
      <SelectField label="Ville" name="city_id" defaultValue="">
        <option value="">Toutes</option>
        {cities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.code})
          </option>
        ))}
      </SelectField>
      <SelectField label="Client" name="client_id" defaultValue="">
        <option value="">Sans client</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>
      {state.error ? <p className="w-full text-xs text-critical">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Création..." : "Créer le rapport →"}
      </Button>
    </form>
  );
}
