import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPricing } from "@/lib/pricing";
import type { City, Zone, ZoneStreet } from "@/lib/types";
import { getOrderingContext } from "../../../context";
import { OrderForm } from "./OrderForm";

export default async function OrderZonePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ client?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const ctx = await getOrderingContext(query.client);
  const supabase = await createClient();

  const [{ data: zoneData }, { data: streetData }, pricing] = await Promise.all([
    supabase.from("zone").select("*").eq("id", id).maybeSingle(),
    supabase.from("zone_street").select("*").eq("zone_id", id).order("position"),
    getPricing(supabase),
  ]);

  const zone = zoneData as Zone | null;
  if (!zone) notFound();

  const { data: city } = await supabase.from("city").select("*").eq("id", zone.city_id).maybeSingle();
  const streets = ((streetData ?? []) as ZoneStreet[]).map((s) => s.name);

  // Today in France (the database applies the same timezone when it validates the date).
  const todayIso = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });

  return (
    <OrderForm
      zoneId={zone.id}
      zoneName={zone.name}
      cityName={(city as City | null)?.name ?? "?"}
      streets={streets}
      pricing={pricing}
      todayIso={todayIso}
      clientQuery={ctx.isStaff ? `?client=${zone.client_id}` : ""}
    />
  );
}
