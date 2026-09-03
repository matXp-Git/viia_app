"use client";

import { useMemo, useState } from "react";
import type { City, Client, Releve } from "@/lib/types";
import { densityLabel, densityPerMeter } from "@/lib/density";
import { SelectField } from "@/components/ui/Field";
import { DeleteReleveButton } from "./DeleteReleveButton";
import { ReleveDetailModal } from "./ReleveDetailModal";

type Props = {
  releves: Releve[];
  cities: City[];
  clients: Client[];
};

export function ReleveTable({ releves, cities, clients }: Props) {
  const [cityFilter, setCityFilter] = useState("");
  const [selected, setSelected] = useState<Releve | null>(null);

  const cityById = useMemo(() => new Map(cities.map((c) => [c.id, c])), [cities]);
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const filtered = cityFilter ? releves.filter((r) => r.city_id === cityFilter) : releves;

  return (
    <div>
      <div className="max-w-[280px]">
        <SelectField label="Filtrer par ville" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
          <option value="">Toutes les villes</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.code})
            </option>
          ))}
        </SelectField>
      </div>

      <div className="mt-(--space-5) overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-2xs uppercase tracking-label text-muted">
              <th className="py-(--space-2) pr-(--space-4) font-normal">Client</th>
              <th className="py-(--space-2) pr-(--space-4) font-normal">Ville</th>
              <th className="py-(--space-2) pr-(--space-4) font-normal">Tronçon</th>
              <th className="py-(--space-2) pr-(--space-4) text-right font-normal">Longueur</th>
              <th className="py-(--space-2) pr-(--space-4) text-right font-normal">Aller</th>
              <th className="py-(--space-2) pr-(--space-4) text-right font-normal">Retour</th>
              <th className="py-(--space-2) pr-(--space-4) text-right font-normal">Déchets/m</th>
              <th className="py-(--space-2) pr-(--space-4) font-normal">Densité</th>
              <th className="py-(--space-2) pr-(--space-4) font-normal">Date</th>
              <th className="py-(--space-2) font-normal" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((releve) => {
              const perMeter = densityPerMeter(releve.count_aller, releve.count_retour, releve.length_m);
              return (
                <tr
                  key={releve.id}
                  onClick={() => setSelected(releve)}
                  className="cursor-pointer border-b border-divider hover:bg-surface"
                >
                  <td className="py-(--space-3) pr-(--space-4) text-heading">
                    {releve.client_id ? (clientById.get(releve.client_id)?.name ?? "?") : "—"}
                  </td>
                  <td className="py-(--space-3) pr-(--space-4) text-heading">{cityById.get(releve.city_id)?.name ?? "?"}</td>
                  <td className="py-(--space-3) pr-(--space-4) text-heading">{releve.troncon}</td>
                  <td className="py-(--space-3) pr-(--space-4) text-right tabular-nums text-heading">
                    {releve.length_m.toLocaleString("fr-FR")} m
                  </td>
                  <td className="py-(--space-3) pr-(--space-4) text-right tabular-nums text-heading">{releve.count_aller}</td>
                  <td className="py-(--space-3) pr-(--space-4) text-right tabular-nums text-heading">{releve.count_retour}</td>
                  <td className="py-(--space-3) pr-(--space-4) text-right tabular-nums font-bold text-heading">
                    {perMeter !== null ? perMeter.toFixed(2) : "—"}
                  </td>
                  <td className="py-(--space-3) pr-(--space-4) text-heading">{densityLabel[releve.density]}</td>
                  <td className="py-(--space-3) pr-(--space-4) text-xs text-muted">
                    {new Date(releve.recorded_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="py-(--space-3)" onClick={(e) => e.stopPropagation()}>
                    <DeleteReleveButton id={releve.id} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 ? <p className="py-(--space-4) text-sm text-muted">Aucun relevé pour le moment.</p> : null}
      </div>

      {selected ? (
        <ReleveDetailModal
          releve={selected}
          cityName={cityById.get(selected.city_id)?.name ?? "?"}
          clientName={selected.client_id ? (clientById.get(selected.client_id)?.name ?? "") : ""}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}
