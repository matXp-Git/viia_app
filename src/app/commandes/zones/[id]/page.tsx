import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPricing } from "@/lib/pricing";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LinkButton } from "@/components/ui/Button";
import type { City, Zone, ZoneStreet } from "@/lib/types";
import { getOrderingContext } from "../../context";
import { ZoneEditor } from "../ZoneEditor";

export default async function EditZonePage({
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

  const [{ data: zoneData }, { data: streetData }, { count: orderCount }, { data: cities }, pricing] = await Promise.all([
    supabase.from("zone").select("*").eq("id", id).maybeSingle(),
    supabase.from("zone_street").select("*").eq("zone_id", id).order("position"),
    supabase.from("client_order").select("id", { count: "exact", head: true }).eq("zone_id", id),
    supabase.from("city").select("*").order("name"),
    getPricing(supabase),
  ]);

  const zone = zoneData as Zone | null;
  if (!zone) notFound();

  const streets = ((streetData ?? []) as ZoneStreet[]).map((s) => s.name);
  const clientQuery = ctx.isStaff ? `?client=${zone.client_id}` : "";
  const cityList = (cities ?? []) as City[];

  if ((orderCount ?? 0) > 0) {
    return (
      <div>
        <Link href={`/commandes${clientQuery}`} className="text-xs uppercase tracking-label text-muted hover:text-heading">
          ← Commandes
        </Link>
        <h1 className="mt-(--space-2) text-display-sm">{zone.name}</h1>
        <p className="mt-(--space-1) text-sm text-muted">{cityList.find((c) => c.id === zone.city_id)?.name ?? "?"}</p>

        <p className="mt-(--space-5) max-w-[70ch] border border-divider p-(--space-4) text-sm text-body">
          Cette zone est liée à {orderCount} commande{(orderCount ?? 0) > 1 ? "s" : ""} : elle ne peut plus être modifiée ni
          supprimée, pour que les bons de commande restent fidèles à ce qui a été demandé. Utilisez « Dupliquer » depuis la
          liste pour repartir de ses rues.
        </p>

        <div className="mt-(--space-6)">
          <Eyebrow>Rues ({streets.length})</Eyebrow>
          <ol className="mt-(--space-3) list-decimal pl-(--space-6) text-sm text-heading">
            {streets.map((street, index) => (
              <li key={index}>{street}</li>
            ))}
          </ol>
        </div>

        <div className="mt-(--space-6)">
          <LinkButton href={`/commandes/zones/${zone.id}/commander${clientQuery}`}>Commander →</LinkButton>
        </div>
      </div>
    );
  }

  return (
    <ZoneEditor
      zoneId={zone.id}
      clientId={null}
      clientName={null}
      clientQuery={clientQuery}
      cities={cityList}
      initialName={zone.name}
      initialCityId={zone.city_id}
      initialStreets={streets}
      discontinuityFee={pricing.discontinuity_fee}
      priceMode={pricing.price_mode}
    />
  );
}
