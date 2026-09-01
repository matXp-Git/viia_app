"use client";

import { useState, useTransition } from "react";
import type { City, Client, Mission } from "@/lib/types";
import { updateMission } from "./actions";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { MissionStatusBadge } from "@/components/ui/StatusBadge";

type Props = {
  mission: Mission;
  city: City | undefined;
  client: Client | null | undefined;
  cities: City[];
  clients: Client[];
};

export function MissionHeader({ mission, city, client, cities, clients }: Props) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canEdit = mission.status === "planned";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await updateMission(mission.id, {}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-(--space-3)">
        <div>
          <div className="text-sm font-bold text-black">{mission.reference ?? "—"}</div>
          <div className="mt-1 text-xs text-charcoal/60">
            {city?.name ?? "?"} · {client?.name ?? "Sans client"} · {mission.date}
          </div>
        </div>
        <div className="flex items-center gap-(--space-4)">
          {canEdit ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs uppercase tracking-label text-charcoal/60 underline decoration-line underline-offset-2 focus-ring hover:text-black"
            >
              Modifier
            </button>
          ) : null}
          <MissionStatusBadge status={mission.status} />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-(--space-4)">
      <SelectField label="Ville" name="city_id" required defaultValue={mission.city_id}>
        {cities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.code})
          </option>
        ))}
      </SelectField>
      <SelectField label="Client" name="client_id" defaultValue={mission.client_id ?? ""}>
        <option value="">Sans client</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>
      <TextField label="Date" name="date" type="date" defaultValue={mission.date} required />
      {error ? <p className="w-full text-xs text-critical">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement..." : "Enregistrer →"}
      </Button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-xs uppercase tracking-label text-charcoal/60 focus-ring hover:text-black"
      >
        Annuler
      </button>
    </form>
  );
}
