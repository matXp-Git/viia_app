import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppUser } from "@/lib/supabase/session";
import type { Client } from "@/lib/types";

export type OrderingContext = {
  isStaff: boolean;
  // The client the screen acts on. Always the user's own for a client account;
  // chosen through ?client= for managers/commercials (null until they pick).
  clientId: string | null;
  clientName: string | null;
  clients: Client[];
  // "?client=<id>" for staff so links keep the selection, "" for clients.
  clientQuery: string;
};

export async function getOrderingContext(requestedClientId: string | undefined): Promise<OrderingContext> {
  const appUser = await getAppUser();
  if (!appUser) redirect("/login");

  const supabase = await createClient();

  if (appUser.role === "client") {
    if (!appUser.client_id) {
      return { isStaff: false, clientId: null, clientName: null, clients: [], clientQuery: "" };
    }
    const { data: own } = await supabase.from("client").select("*").eq("id", appUser.client_id).maybeSingle();
    return {
      isStaff: false,
      clientId: appUser.client_id,
      clientName: (own as Client | null)?.name ?? null,
      clients: [],
      clientQuery: "",
    };
  }

  const { data } = await supabase.from("client").select("*").order("name");
  const clients = (data ?? []) as Client[];
  const chosen = clients.find((c) => c.id === requestedClientId) ?? null;

  return {
    isStaff: true,
    clientId: chosen?.id ?? null,
    clientName: chosen?.name ?? null,
    clients,
    clientQuery: chosen ? `?client=${chosen.id}` : "",
  };
}
