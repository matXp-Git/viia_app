"use client";

import { useActionState } from "react";
import { createClientRecord, type FormState } from "../actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

const initialState: FormState = {};

export function CreateClientForm() {
  const [state, formAction, pending] = useActionState(createClientRecord, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-(--space-4) border border-divider p-(--space-4)">
      <TextField label="Nom du client" name="name" required />
      {state.error ? <p className="w-full text-xs text-critical">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Création..." : "Ajouter →"}
      </Button>
    </form>
  );
}
