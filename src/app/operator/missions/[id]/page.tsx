import type { Viewport } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppUser } from "@/lib/supabase/session";
import type { City, Client, Mission } from "@/lib/types";
import { MissionRunner } from "./MissionRunner";

// Support fixé sur le véhicule — un zoom accidentel pendant la conduite est
// pire qu'utile ici. Verrouillé uniquement sur l'écran de mission.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function OperatorMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appUser = await getAppUser();
  if (!appUser?.operator_id) return null; // layout redirect is in flight

  const supabase = await createClient();
  const operatorId = appUser.operator_id;

  const [{ data: mission }, { data: assignment }] = await Promise.all([
    supabase.from("mission").select("*, city:city_id(*), client:client_id(*)").eq("id", id).single(),
    supabase.from("mission_assignment").select("*").eq("mission_id", id).eq("operator_id", operatorId).maybeSingle(),
  ]);

  if (!mission || !assignment) {
    notFound();
  }

  const typedMission = mission as Mission & { city: City | null; client: Client | null };

  return (
    <MissionRunner
      missionId={id}
      reference={typedMission.reference ?? "—"}
      cityName={typedMission.city?.name ?? "?"}
      clientName={typedMission.client?.name ?? null}
      date={typedMission.date}
      kind={typedMission.kind}
    />
  );
}
