"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAppUser } from "@/lib/supabase/session";
import { loadOrderDetails } from "@/lib/orderData";
import { orderErrorMessage } from "@/lib/orders";
import { orderNotifyAddress, sendOrderEmail, type OrderEmailStatus } from "@/lib/orderEmail";
import type { DelayType, TimeSlot } from "@/lib/types";

async function requireOrderingUser() {
  const appUser = await getAppUser();
  if (!appUser || (appUser.role !== "client" && appUser.role !== "manager" && appUser.role !== "commercial")) {
    throw new Error("Action non autorisée.");
  }
  return appUser;
}

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// ---- Zones -------------------------------------------------------------------

export type SaveZoneInput = {
  zoneId: string | null;
  // Only meaningful for managers/commercials (a client always acts on their own account).
  clientId: string | null;
  cityId: string;
  name: string;
  streets: string[];
};

export async function saveZoneAction(input: SaveZoneInput): Promise<{ error?: string; zoneId?: string }> {
  await requireOrderingUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("save_zone", {
    p_zone_id: input.zoneId,
    p_client_id: input.clientId,
    p_city_id: input.cityId || null,
    p_name: input.name,
    p_streets: input.streets,
  });
  if (error) return { error: orderErrorMessage(error.message) };

  revalidatePath("/commandes");
  return { zoneId: data as string };
}

export async function deleteZoneAction(zoneId: string): Promise<{ error?: string }> {
  await requireOrderingUser();
  const supabase = await createClient();

  const { error } = await supabase.rpc("delete_zone", { p_zone_id: zoneId });
  if (error) return { error: orderErrorMessage(error.message) };

  revalidatePath("/commandes");
  return {};
}

export async function duplicateZoneAction(zoneId: string): Promise<{ error?: string; zoneId?: string }> {
  await requireOrderingUser();
  const supabase = await createClient();

  const [{ data: zone }, { data: streets }] = await Promise.all([
    supabase.from("zone").select("client_id, city_id, name").eq("id", zoneId).maybeSingle(),
    supabase.from("zone_street").select("name").eq("zone_id", zoneId).order("position"),
  ]);
  if (!zone) return { error: orderErrorMessage("zone_not_found") };

  const streetNames = (streets ?? []).map((s: { name: string }) => s.name);

  // "(copie)", then "(copie 2)"... until the name is free.
  for (let attempt = 1; attempt <= 10; attempt++) {
    const suffix = attempt === 1 ? " (copie)" : ` (copie ${attempt})`;
    const name = `${(zone.name as string).slice(0, 100 - suffix.length)}${suffix}`;
    const { data, error } = await supabase.rpc("save_zone", {
      p_zone_id: null,
      p_client_id: zone.client_id,
      p_city_id: zone.city_id,
      p_name: name,
      p_streets: streetNames,
    });
    if (!error) {
      revalidatePath("/commandes");
      return { zoneId: data as string };
    }
    if (error.message !== "duplicate_name") return { error: orderErrorMessage(error.message) };
  }
  return { error: orderErrorMessage("duplicate_name") };
}

// ---- Orders ------------------------------------------------------------------

export type OrderInput = {
  zoneId: string;
  delayType: DelayType;
  targetDate: string | null;
  withinDays: number | null;
  timeSlot: TimeSlot | null;
  remark: string;
};

export async function createOrderAction(
  input: OrderInput,
): Promise<{ error?: string; orderId?: string; mail?: OrderEmailStatus }> {
  await requireOrderingUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_order", {
    p_zone_id: input.zoneId,
    p_delay_type: input.delayType,
    p_target_date: input.targetDate || null,
    p_within_days: input.withinDays,
    p_time_slot: input.timeSlot,
    p_remark: input.remark || null,
  });
  if (error) return { error: orderErrorMessage(error.message) };

  const { order_id: orderId } = data as { order_id: string };

  // The order exists at this point whatever happens to the e-mail.
  let mail: OrderEmailStatus = "skipped";
  const details = await loadOrderDetails(supabase, orderId);
  if (details) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const origin = await requestOrigin();
    mail = await sendOrderEmail({
      details,
      bonUrl: `${origin}/commandes/bon/${orderId}`,
      to: [orderNotifyAddress(), ...(user?.email ? [user.email] : [])],
      replyTo: user?.email,
    });
  }

  revalidatePath("/commandes");
  revalidatePath("/manager");
  return { orderId, mail };
}

export async function emailOrderCopyAction(orderId: string): Promise<{ status: OrderEmailStatus | "missing" }> {
  await requireOrderingUser();
  const supabase = await createClient();

  const details = await loadOrderDetails(supabase, orderId);
  if (!details) return { status: "missing" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { status: "skipped" };

  const origin = await requestOrigin();
  const status = await sendOrderEmail({
    details,
    bonUrl: `${origin}/commandes/bon/${orderId}`,
    to: [user.email],
    isCopy: true,
  });
  return { status };
}
