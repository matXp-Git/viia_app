"use client";

import { useActionState, useState } from "react";
import { createReleve, type FormState } from "./actions";
import type { City, Client } from "@/lib/types";
import { densityLabel, densityPerMeter, suggestDensity } from "@/lib/density";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";

const initialState: FormState = {};

type Props = {
  cities: City[];
  clients: Client[];
};

export function CreateReleveForm({ cities, clients }: Props) {
  const [state, formAction, pending] = useActionState(createReleve, initialState);

  const [lengthM, setLengthM] = useState("");
  const [countAller, setCountAller] = useState("");
  const [countRetour, setCountRetour] = useState("");
  const [densityTouched, setDensityTouched] = useState(false);
  const [density, setDensity] = useState<"" | "faible" | "moyen" | "fort">("");

  const perMeter = densityPerMeter(Number(countAller) || 0, Number(countRetour) || 0, Number(lengthM) || 0);
  const suggested = suggestDensity(perMeter);
  const effectiveDensity = densityTouched ? density : (suggested ?? "");

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-(--space-4) border border-divider p-(--space-4)">
      <SelectField label="Client" name="client_id" defaultValue="">
        <option value="">Sans client</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>
      <SelectField label="Ville" name="city_id" required defaultValue="">
        <option value="" disabled>
          Choisir...
        </option>
        {cities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.code})
          </option>
        ))}
      </SelectField>
      <TextField label="Nom du tronçon" name="troncon" required placeholder="Rue de..." />
      <TextField
        label="Longueur (m)"
        name="length_m"
        type="number"
        min="0.1"
        step="0.1"
        required
        value={lengthM}
        onChange={(e) => setLengthM(e.target.value)}
      />
      <TextField
        label="Aller (déchets)"
        name="count_aller"
        type="number"
        min="0"
        step="1"
        required
        value={countAller}
        onChange={(e) => setCountAller(e.target.value)}
      />
      <TextField
        label="Retour (déchets)"
        name="count_retour"
        type="number"
        min="0"
        step="1"
        required
        value={countRetour}
        onChange={(e) => setCountRetour(e.target.value)}
      />
      <SelectField
        label={`Densité${perMeter !== null ? ` (${perMeter.toFixed(2)}/m)` : ""}`}
        name="density"
        required
        value={effectiveDensity}
        onChange={(e) => {
          setDensityTouched(true);
          setDensity(e.target.value as "faible" | "moyen" | "fort");
        }}
      >
        <option value="" disabled>
          {perMeter !== null ? "Suggestion ci-dessus" : "Renseignez aller/retour/longueur"}
        </option>
        {(Object.keys(densityLabel) as (keyof typeof densityLabel)[]).map((d) => (
          <option key={d} value={d}>
            {densityLabel[d]}
          </option>
        ))}
      </SelectField>

      {state.error ? <p className="w-full text-xs text-critical">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement..." : "Ajouter le relevé →"}
      </Button>
    </form>
  );
}
