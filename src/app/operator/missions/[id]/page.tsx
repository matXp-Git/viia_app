import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppUser } from "@/lib/supabase/session";
import type { City, Client, Mission, TrackSegment, Weighing } from "@/lib/types";
import { MissionRunner } from "./MissionRunner";

export default async function OperatorMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appUser = await getAppUser();
  if (!appUser?.operator_id) return null; // layout redirect is in flight

  const supabase = await createClient();
  const operatorId = appUser.operator_id;

  const [{ data: mission }, { data: assignment }, { data: segments }, { data: weighing }] = await Promise.all([
    supabase.from("mission").select("*, city:city_id(*), client:client_id(*)").eq("id", id).single(),
    supabase.from("mission_assignment").select("*").eq("mission_id", id).eq("operator_id", operatorId).maybeSingle(),
    supabase
      .from("track_segment")
      .select("*")
      .eq("mission_id", id)
      .eq("operator_id", operatorId)
      .order("created_at", { ascending: false }),
    supabase.from("weighing").select("*").eq("mission_id", id).eq("operator_id", operatorId).maybeSingle(),
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
      missionStatus={typedMission.status}
      completedAt={assignment!.completed_at}
      latestSegment={(segments?.[0] as TrackSegment | undefined) ?? null}
      weighing={(weighing as Weighing | null) ?? null}
    />
  );
}
