import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button, LinkButton } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";
import { MissionStatusBadge } from "@/components/ui/StatusBadge";
import { formatEuro, priceModeLabel } from "@/lib/pricing";
import { formatDateFr, timeSlotLabel } from "@/lib/orders";
import type { City, ClientOrder, Mission, Zone } from "@/lib/types";
import { getOrderingContext } from "./context";
import { ZoneActions } from "./ZoneActions";

type ZoneRow = Zone & { zone_street: { count: number }[]; client_order: { id: string }[] };
type OrderSummary = Pick<ClientOrder, "id" | "mission_id" | "estimated_amount" | "final_amount" | "price_mode">;

export default async function CommandesDashboard({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const params = await searchParams;
  const ctx = await getOrderingContext(params.client);
  const supabase = await createClient();

  const picker = ctx.isStaff ? (
    <form method="get" className="mt-(--space-6) flex flex-wrap items-end gap-(--space-4) border border-divider p-(--space-4)">
      <SelectField label="Commander pour le client" name="client" defaultValue={ctx.clientId ?? ""}>
        <option value="" disabled>
          Choisir un client...
        </option>
        {ctx.clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </SelectField>
      <Button type="submit" variant="ghost">
        Afficher →
      </Button>
    </form>
  ) : null;

  if (!ctx.clientId) {
    return (
      <div>
        <h1 className="text-display-sm">Commandes</h1>
        {picker}
        <p className="mt-(--space-6) text-sm text-muted">
          {ctx.isStaff
            ? "Sélectionnez un client pour gérer ses zones et passer commande en son nom."
            : "Votre compte n'est associé à aucun client — contactez ViiA."}
        </p>
      </div>
    );
  }

  const [{ data: zoneData }, { data: missionData }, { data: orderData }, { data: cityData }] = await Promise.all([
    supabase.from("zone").select("*, zone_street(count), client_order(id)").eq("client_id", ctx.clientId).order("name"),
    supabase.from("mission").select("*").eq("client_id", ctx.clientId).eq("kind", "operation").order("date", { ascending: true }),
    supabase
      .from("client_order")
      .select("id, mission_id, estimated_amount, final_amount, price_mode")
      .eq("client_id", ctx.clientId),
    supabase.from("city").select("*"),
  ]);

  const zones = (zoneData ?? []) as ZoneRow[];
  const missions = (missionData ?? []) as Mission[];
  const orderByMission = new Map(((orderData ?? []) as OrderSummary[]).map((o) => [o.mission_id, o]));
  const cityById = new Map(((cityData ?? []) as City[]).map((c) => [c.id, c]));

  const running = missions.filter((m) => m.status !== "completed");
  const done = missions.filter((m) => m.status === "completed").reverse();

  function missionRows(items: Mission[], dateLabel: string) {
    if (items.length === 0) return null;
    return (
      <div className="mt-(--space-3) flex flex-col">
        {items.map((mission) => {
          const order = orderByMission.get(mission.id);
          return (
            <div
              key={mission.id}
              className="flex flex-wrap items-center justify-between gap-(--space-4) border-t border-divider py-(--space-4) last:border-b"
            >
              <div>
                <div className="text-sm font-bold text-heading">{mission.reference ?? "—"}</div>
                <div className="mt-1 text-xs text-muted">
                  {[mission.note, cityById.get(mission.city_id)?.name, `${dateLabel} ${formatDateFr(mission.date)}`]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {(mission.streets ?? []).length > 0 ? (
                  <div className="mt-(--space-2) max-w-[70ch] text-xs text-body">
                    Rues ({mission.streets.length}) : {mission.streets.join(" · ")}
                  </div>
                ) : null}
                {mission.time_slot ? (
                  <div className="mt-1 text-xs text-muted">Créneau : {timeSlotLabel[mission.time_slot]}</div>
                ) : null}
                {mission.remark ? (
                  <div className="mt-1 max-w-[70ch] whitespace-pre-line text-xs text-muted">Remarque : {mission.remark}</div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-(--space-4)">
                {order ? (
                  <span className="text-sm text-heading">
                    {formatEuro(order.final_amount ?? order.estimated_amount)} {priceModeLabel(order.price_mode)}
                    <span className="ml-(--space-1) text-xs text-muted">{order.final_amount === null ? "estimé" : "final"}</span>
                  </span>
                ) : null}
                {order ? (
                  <Link
                    href={`/commandes/bon/${order.id}${ctx.clientQuery}`}
                    className="text-xs uppercase tracking-label text-muted underline decoration-divider underline-offset-2 hover:text-heading"
                  >
                    Bon de commande
                  </Link>
                ) : null}
                <MissionStatusBadge status={mission.status} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-display-sm">{ctx.isStaff ? `Commandes — ${ctx.clientName}` : "Mes commandes"}</h1>
      {picker}

      <section className="mt-(--space-7)">
        <div className="flex flex-wrap items-center justify-between gap-(--space-4)">
          <Eyebrow>Zones</Eyebrow>
          <LinkButton href={`/commandes/zones/nouveau${ctx.clientQuery}`} variant="ghost">
            + Nouvelle zone
          </LinkButton>
        </div>
        <p className="mt-(--space-2) max-w-[62ch] text-sm text-muted">
          Une zone regroupe plusieurs rues. Créez-la une fois, puis commandez-la quand vous voulez.
        </p>
        <div className="mt-(--space-3) flex flex-col">
          {zones.map((zone) => {
            const orderCount = zone.client_order.length;
            const streetCount = zone.zone_street[0]?.count ?? 0;
            return (
              <div
                key={zone.id}
                className="flex flex-wrap items-center justify-between gap-(--space-4) border-t border-divider py-(--space-4) last:border-b"
              >
                <div>
                  <div className="text-sm font-bold text-heading">{zone.name}</div>
                  <div className="mt-1 text-xs text-muted">
                    {cityById.get(zone.city_id)?.name ?? "?"} · {streetCount} rue{streetCount > 1 ? "s" : ""}
                    {orderCount > 0 ? ` · commandée ${orderCount} fois` : ""}
                  </div>
                </div>
                <ZoneActions zoneId={zone.id} zoneName={zone.name} locked={orderCount > 0} clientQuery={ctx.clientQuery} />
              </div>
            );
          })}
          {zones.length === 0 ? <p className="py-(--space-3) text-sm text-muted">Aucune zone pour le moment.</p> : null}
        </div>
      </section>

      <section className="mt-(--space-9)">
        <Eyebrow>Missions en cours</Eyebrow>
        {missionRows(running, "avant le")}
        {running.length === 0 ? <p className="mt-(--space-3) text-sm text-muted">Aucune mission en cours.</p> : null}
      </section>

      <section className="mt-(--space-9)">
        <Eyebrow>Missions réalisées</Eyebrow>
        {missionRows(done, "le")}
        {done.length === 0 ? <p className="mt-(--space-3) text-sm text-muted">Aucune mission réalisée.</p> : null}
      </section>
    </div>
  );
}
