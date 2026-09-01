"use client";

import { useActionState } from "react";
import type { City, Client } from "@/lib/types";
import type { FormState } from "./actions";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";

const initialState: FormState = {};

type Props = {
  cities: City[];
  clients: Client[];
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
};

export function CreateMissionForm({ cities, clients, action }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-(--space-4) border border-line p-(--space-4)">
      <SelectField label="Ville" name="city_id" required defaultValue="">
        <option value="" disabled>
          Choisir...
        </option>
        {cities.map((city) => (
          <option key={city.id} value={city.id}>
            {city.name} ({city.code})
          </option>
        ))}
      </SelectField>
      <SelectField label="Client" name="client_id" defaultValue="">
        <option value="">Sans client</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </SelectField>
      <TextField label="Date" name="date" type="date" required />
      {state.error ? <p className="w-full text-xs text-critical">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Création..." : "Créer la mission →"}
      </Button>
    </form>
  );
}
