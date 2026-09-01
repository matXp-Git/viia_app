import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppUser } from "@/lib/supabase/session";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { MissionStatusBadge } from "@/components/ui/StatusBadge";
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
    <main className="mx-auto max-w-(--container-max) px-(--gutter) py-(--space-9)">
      <Eyebrow>Mission</Eyebrow>
      <div className="mt-(--space-2) flex flex-wrap items-center justify-between gap-(--space-3)">
        <h1 className="text-display-sm">{typedMission.reference ?? "—"}</h1>
        <MissionStatusBadge status={typedMission.status} />
      </div>
      <p className="mt-(--space-2) text-sm text-charcoal/60">
        {typedMission.city?.name ?? "?"} {typedMission.client ? `· ${typedMission.client.name}` : ""} · {typedMission.date}
      </p>

      <div className="mt-(--space-7)">
        <MissionRunner
          missionId={id}
          missionStatus={typedMission.status}
          completedAt={assignment!.completed_at}
          latestSegment={(segments?.[0] as TrackSegment | undefined) ?? null}
          weighing={(weighing as Weighing | null) ?? null}
        />
      </div>
    </main>
  );
}
