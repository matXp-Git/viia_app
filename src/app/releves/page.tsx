import { createClient } from "@/lib/supabase/server";
import type { City, Client, Releve } from "@/lib/types";
import { CreateReleveForm } from "./CreateReleveForm";
import { ReleveTable } from "./ReleveTable";

export default async function RelevesPage() {
  const supabase = await createClient();

  const [{ data: releves }, { data: cities }, { data: clients }] = await Promise.all([
    supabase.from("releve").select("*").order("recorded_at", { ascending: false }),
    supabase.from("city").select("*").order("name"),
    supabase.from("client").select("*").order("name"),
  ]);

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

      <div className="mt-(--space-7)">
        <ReleveTable
          releves={(releves ?? []) as Releve[]}
          cities={(cities ?? []) as City[]}
          clients={(clients ?? []) as Client[]}
        />
      </div>
    </div>
  );
}
