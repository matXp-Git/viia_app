import { createClient } from "@/lib/supabase/server";
import type { City, Client, Releve } from "@/lib/types";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { densityLabel, densityPerMeter } from "@/lib/density";
import { CreateReleveForm } from "./CreateReleveForm";
import { DeleteReleveButton } from "./DeleteReleveButton";

export default async function RelevesPage() {
  const supabase = await createClient();

  const [{ data: releves }, { data: cities }, { data: clients }] = await Promise.all([
    supabase.from("releve").select("*").order("recorded_at", { ascending: false }),
    supabase.from("city").select("*").order("name"),
    supabase.from("client").select("*").order("name"),
  ]);

  const cityById = new Map(((cities ?? []) as City[]).map((c) => [c.id, c]));
  const clientById = new Map(((clients ?? []) as Client[]).map((c) => [c.id, c]));

  return (
    <div>
      <h1 className="text-display-sm">Relevés de tronçons</h1>
      <p className="mt-(--space-2) max-w-[62ch] text-sm text-muted">
        Données terrain à montrer en clientèle : déchets comptés à l&apos;aller et au retour sur un tronçon,
        densité au mètre. Saisie après passage, pas en temps réel.
      </p>

      <div className="mt-(--space-6)">
        <CreateReleveForm cities={(cities ?? []) as City[]} clients={(clients ?? []) as Client[]} />
      </div>

      <div className="mt-(--space-7) overflow-x-auto">
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
            {((releves ?? []) as Releve[]).map((releve) => {
              const perMeter = densityPerMeter(releve.count_aller, releve.count_retour, releve.length_m);
              return (
                <tr key={releve.id} className="border-b border-divider">
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
                  <td className="py-(--space-3)">
                    <DeleteReleveButton id={releve.id} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(releves ?? []).length === 0 ? <p className="py-(--space-4) text-sm text-muted">Aucun relevé pour le moment.</p> : null}
      </div>
    </div>
  );
}
