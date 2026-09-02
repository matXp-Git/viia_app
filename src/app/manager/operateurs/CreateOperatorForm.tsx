"use client";

import { useActionState } from "react";
import { createOperator, type FormState } from "../actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

const initialState: FormState = {};

export function CreateOperatorForm() {
  const [state, formAction, pending] = useActionState(createOperator, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-(--space-4) border border-divider p-(--space-4)">
      <TextField label="Nom" name="name" required />
      <TextField label="Contact" name="contact" placeholder="Téléphone ou email" />
      {state.error ? <p className="w-full text-xs text-critical">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Création..." : "Ajouter →"}
      </Button>
    </form>
  );
}
