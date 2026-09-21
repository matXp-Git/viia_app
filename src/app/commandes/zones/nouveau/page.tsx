import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPricing } from "@/lib/pricing";
import type { City } from "@/lib/types";
import { getOrderingContext } from "../../context";
import { ZoneEditor } from "../ZoneEditor";

export default async function NewZonePage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const params = await searchParams;
  const ctx = await getOrderingContext(params.client);
  if (!ctx.clientId) redirect("/commandes");

  const supabase = await createClient();
  const [{ data: cities }, pricing] = await Promise.all([
    supabase.from("city").select("*").order("name"),
    getPricing(supabase),
  ]);

  return (
    <ZoneEditor
      zoneId={null}
      clientId={ctx.isStaff ? ctx.clientId : null}
      clientName={ctx.isStaff ? ctx.clientName : null}
      clientQuery={ctx.clientQuery}
      cities={(cities ?? []) as City[]}
      initialName=""
      initialCityId=""
      initialStreets={[]}
      discontinuityFee={pricing.discontinuity_fee}
      priceMode={pricing.price_mode}
    />
  );
}
