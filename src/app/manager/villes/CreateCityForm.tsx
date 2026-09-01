"use client";

import { useActionState } from "react";
import { createCity, type FormState } from "../actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

const initialState: FormState = {};

export function CreateCityForm() {
  const [state, formAction, pending] = useActionState(createCity, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-(--space-4) border border-line p-(--space-4)">
      <TextField label="Nom de la ville" name="name" required />
      <TextField label="Code (préfixe)" name="code" required maxLength={8} placeholder="LB" />
      {state.error ? <p className="w-full text-xs text-critical">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Création..." : "Ajouter →"}
      </Button>
    </form>
  );
}
