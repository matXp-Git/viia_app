"use client";

import { useActionState } from "react";
import type { PricingSetting } from "@/lib/types";
import { updatePricing, type FormState } from "../actions";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";

const initialState: FormState = {};

export function PricingForm({ pricing }: { pricing: PricingSetting }) {
  const [state, formAction, pending] = useActionState(updatePricing, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-(--space-4) border border-divider p-(--space-4)">
      <TextField
        label="Prix par rue (€)"
        name="price_per_street"
        type="number"
        min="0"
        step="0.01"
        required
        defaultValue={pricing.price_per_street}
      />
      <TextField
        label="Forfait par coupure (€)"
        name="discontinuity_fee"
        type="number"
        min="0"
        step="0.01"
        required
        defaultValue={pricing.discontinuity_fee}
      />
      <SelectField label="Les montants sont" name="price_mode" defaultValue={pricing.price_mode}>
        <option value="ttc">TTC</option>
        <option value="ht">HT</option>
      </SelectField>
      {state.error ? <p className="w-full text-xs text-critical">{state.error}</p> : null}
      {state.success ? <p className="w-full text-xs text-success">Tarifs enregistrés.</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement..." : "Enregistrer →"}
      </Button>
    </form>
  );
}
