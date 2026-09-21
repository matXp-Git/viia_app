import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientOrder, Mission } from "@/lib/types";

export type OrderDetails = {
  order: ClientOrder;
  mission: Mission;
  cityName: string;
  clientName: string;
  zoneName: string;
};

type OrderRow = ClientOrder & {
  mission: (Mission & { city: { name: string } | null }) | null;
  client: { name: string } | null;
  zone: { name: string } | null;
};

// Everything a purchase order (screen, print, e-mail) needs, read through the
// caller's own session — so row-level security decides who may see it.
export async function loadOrderDetails(supabase: SupabaseClient, orderId: string): Promise<OrderDetails | null> {
  const { data } = await supabase
    .from("client_order")
    .select("*, mission:mission_id(*, city:city_id(name)), client:client_id(name), zone:zone_id(name)")
    .eq("id", orderId)
    .maybeSingle();

  const row = data as OrderRow | null;
  if (!row || !row.mission) return null;

  const { mission: missionRow, client, zone, ...order } = row;
  const { city, ...mission } = missionRow;

  return {
    order: order as ClientOrder,
    mission: mission as Mission,
    cityName: city?.name ?? "?",
    clientName: client?.name ?? "?",
    zoneName: zone?.name ?? mission.note ?? "—",
  };
}
