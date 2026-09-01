import { createClient } from "@/lib/supabase/server";
import type { City } from "@/lib/types";
import { Eyebrow, DataLabel } from "@/components/ui/Eyebrow";
import { CreateCityForm } from "./CreateCityForm";

export default async function VillesPage() {
  const supabase = await createClient();
  const { data: cities } = await supabase.from("city").select("*").order("name");

  return (
    <div>
      <Eyebrow>Villes</Eyebrow>
      <h1 className="mt-(--space-2) text-display-sm">Villes &amp; collectivités</h1>

      <div className="mt-(--space-6)">
        <CreateCityForm />
      </div>

      <div className="mt-(--space-6) flex flex-col">
        {((cities ?? []) as City[]).map((city) => (
          <div key={city.id} className="flex items-center justify-between gap-(--space-4) border-t border-line py-(--space-3) last:border-b">
            <span className="text-sm text-black">{city.name}</span>
            <DataLabel>{city.code}</DataLabel>
          </div>
        ))}
        {(cities ?? []).length === 0 ? <p className="py-(--space-3) text-sm text-charcoal/60">Aucune ville.</p> : null}
      </div>
    </div>
  );
}
