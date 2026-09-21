import { createClient } from "@/lib/supabase/server";
import { getPricing } from "@/lib/pricing";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PricingForm } from "./PricingForm";

export default async function TarifsPage() {
  const supabase = await createClient();
  const pricing = await getPricing(supabase);

  return (
    <div>
      <Eyebrow>Tarifs</Eyebrow>
      <h1 className="mt-(--space-2) text-display-sm">Tarifs des commandes</h1>
      <p className="mt-(--space-2) max-w-[70ch] text-sm text-muted">
        Ces montants servent à l&apos;estimation affichée aux clients quand ils commandent. Chaque commande conserve les
        tarifs en vigueur au moment où elle est passée : modifier ces valeurs n&apos;affecte pas les commandes
        existantes. Changer TTC/HT modifie uniquement la mention affichée, les montants restent ceux que vous saisissez.
      </p>

      <div className="mt-(--space-6)">
        <PricingForm pricing={pricing} />
      </div>
    </div>
  );
}
