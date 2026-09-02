import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { MissionStatusBadge } from "@/components/ui/StatusBadge";
import { TrackMap, type TrackFeature, type DumpFeature } from "@/components/map/TrackMap";
import type { City, Client, Mission, Operator, TrackSegment, Weighing, WildDump } from "@/lib/types";

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} h ${rest.toString().padStart(2, "0")}`;
}

export default async function ManagerMissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: mission },
    { data: assignments },
    { data: segments },
    { data: weighings },
    { data: dumps },
  ] = await Promise.all([
    supabase.from("mission").select("*, city:city_id(*), client:client_id(*)").eq("id", id).single(),
    supabase.from("mission_assignment").select("*, operator:operator_id(*)").eq("mission_id", id),
    supabase.from("track_segment").select("*").eq("mission_id", id).order("created_at"),
    supabase.from("weighing").select("*").eq("mission_id", id).order("recorded_at"),
    supabase.from("wild_dump").select("*").eq("mission_id", id).order("reported_at"),
  ]);

  if (!mission) notFound();

  const typedMission = mission as Mission & { city: City | null; client: Client | null };
  const typedSegments = (segments ?? []) as TrackSegment[];
  const typedWeighings = (weighings ?? []) as Weighing[];
  const typedDumps = (dumps ?? []) as WildDump[];
  const operators = (assignments ?? []) as { operator_id: string; operator: Operator | null }[];

  const segmentIds = typedSegments.map((s) => s.id);
  const { data: points } = segmentIds.length
    ? await supabase
        .from("track_point")
        .select("segment_id, lat, lng, recorded_at")
        .in("segment_id", segmentIds)
        .order("recorded_at")
    : { data: [] };

  const pointsBySegment = new Map<string, { lat: number; lng: number; recorded_at: string }[]>();
  for (const p of points ?? []) {
    const list = pointsBySegment.get(p.segment_id) ?? [];
    list.push(p);
    pointsBySegment.set(p.segment_id, list);
  }

  // Per-operator summary: sessions, approximate time worked (sum of
  // last-minus-first point per segment), first/last activity, kilos.
  type OperatorSummary = {
    operator: Operator | null;
    sessions: number;
    durationMs: number;
    firstActivity: string | null;
    lastActivity: string | null;
    kilosTotal: number;
    kilosRecycled: number;
  };
  const summaryByOperator = new Map<string, OperatorSummary>();

  for (const { operator_id, operator } of operators) {
    summaryByOperator.set(operator_id, {
      operator,
      sessions: 0,
      durationMs: 0,
      firstActivity: null,
      lastActivity: null,
      kilosTotal: 0,
      kilosRecycled: 0,
    });
  }

  for (const segment of typedSegments) {
    const summary = summaryByOperator.get(segment.operator_id);
    if (!summary) continue;
    summary.sessions += 1;
    const segPoints = pointsBySegment.get(segment.id) ?? [];
    if (segPoints.length > 0) {
      const first = segPoints[0]!.recorded_at;
      const last = segPoints[segPoints.length - 1]!.recorded_at;
      summary.durationMs += new Date(last).getTime() - new Date(first).getTime();
      if (!summary.firstActivity || first < summary.firstActivity) summary.firstActivity = first;
      if (!summary.lastActivity || last > summary.lastActivity) summary.lastActivity = last;
    }
  }

  for (const w of typedWeighings) {
    const summary = summaryByOperator.get(w.operator_id);
    if (!summary) continue;
    summary.kilosTotal += Number(w.kilos_total);
    summary.kilosRecycled += Number(w.kilos_recycled);
  }

  const missionKilosTotal = typedWeighings.reduce((sum, w) => sum + Number(w.kilos_total), 0);
  const missionKilosRecycled = typedWeighings.reduce((sum, w) => sum + Number(w.kilos_recycled), 0);
  const recyclingRate = missionKilosTotal > 0 ? Math.round((missionKilosRecycled / missionKilosTotal) * 100) : null;

  const tracks: TrackFeature[] = typedSegments
    .map((segment) => ({
      properties: {
        missionId: segment.mission_id,
        reference: typedMission.reference ?? "—",
        cityName: typedMission.city?.name ?? "?",
        date: typedMission.date,
        source: segment.source,
      },
      coordinates: (pointsBySegment.get(segment.id) ?? []).map((p) => [p.lng, p.lat] as [number, number]),
    }))
    .filter((t) => t.coordinates.length >= 2);

  const dumpFeatures: DumpFeature[] = typedDumps.map((dump) => ({
    properties: {
      reference: typedMission.reference ?? "—",
      cityName: typedMission.city?.name ?? "?",
      date: typedMission.date,
      lat: dump.lat,
      lng: dump.lng,
    },
    coordinate: [dump.lng, dump.lat],
  }));

  return (
    <div>
      <Eyebrow>Mission</Eyebrow>
      <div className="mt-(--space-2) flex flex-wrap items-center justify-between gap-(--space-3)">
        <div>
          <h1 className="text-display-sm">{typedMission.reference ?? "—"}</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            {typedMission.city?.name ?? "?"} {typedMission.client ? `· ${typedMission.client.name}` : ""} ·{" "}
            {typedMission.date}
          </p>
        </div>
        <MissionStatusBadge status={typedMission.status} />
      </div>
      <Link href="/manager" className="mt-(--space-2) inline-block text-xs uppercase tracking-label text-charcoal/60 hover:text-black">
        ← Retour aux missions
      </Link>

      <div className="mt-(--space-7) grid grid-cols-3 gap-px border border-line bg-line mobile:grid-cols-1">
        <div className="bg-white p-(--space-4)">
          <div className="text-2xs uppercase text-charcoal/60">Total collecté</div>
          <div className="mt-(--space-2) text-sm font-bold text-black">{missionKilosTotal.toFixed(1)} kg</div>
        </div>
        <div className="bg-white p-(--space-4)">
          <div className="text-2xs uppercase text-charcoal/60">Dont recyclé</div>
          <div className="mt-(--space-2) text-sm font-bold text-black">{missionKilosRecycled.toFixed(1)} kg</div>
        </div>
        <div className="bg-white p-(--space-4)">
          <div className="text-2xs uppercase text-charcoal/60">Taux de recyclage</div>
          <div className="mt-(--space-2) text-sm font-bold text-black">{recyclingRate !== null ? `${recyclingRate}%` : "—"}</div>
        </div>
      </div>

      <div className="mt-(--space-7)">
        <Eyebrow>Carte</Eyebrow>
        <div className="mt-(--space-3)">
          <TrackMap tracks={tracks} dumps={dumpFeatures} />
        </div>
      </div>

      <div className="mt-(--space-7)">
        <Eyebrow>Opérateurs</Eyebrow>
        <div className="mt-(--space-3) flex flex-col">
          {[...summaryByOperator.entries()].map(([operatorId, summary]) => (
            <div
              key={operatorId}
              className="flex flex-wrap items-center justify-between gap-(--space-4) border-t border-line py-(--space-3) last:border-b"
            >
              <div>
                <div className="text-sm text-black">{summary.operator?.name ?? "?"}</div>
                <div className="mt-1 text-xs text-charcoal/60">
                  {summary.sessions} session{summary.sessions > 1 ? "s" : ""}
                  {summary.firstActivity ? ` · du ${new Date(summary.firstActivity).toLocaleDateString("fr-FR")}` : ""}
                  {summary.lastActivity ? ` au ${new Date(summary.lastActivity).toLocaleDateString("fr-FR")}` : ""}
                  {summary.durationMs > 0 ? ` · ${formatDuration(summary.durationMs)} de suivi` : ""}
                </div>
              </div>
              <div className="text-sm font-bold text-black">
                {summary.kilosTotal.toFixed(1)} kg
                <span className="ml-(--space-2) text-xs font-normal text-charcoal/60">
                  ({summary.kilosRecycled.toFixed(1)} kg recyclé)
                </span>
              </div>
            </div>
          ))}
          {summaryByOperator.size === 0 ? <p className="py-(--space-3) text-sm text-charcoal/60">Aucun opérateur affecté.</p> : null}
        </div>
      </div>

      <div className="mt-(--space-7)">
        <Eyebrow>Dépôts sauvages signalés</Eyebrow>
        <div className="mt-(--space-3) flex flex-col">
          {typedDumps.map((dump) => {
            const operatorName = operators.find((a) => a.operator_id === dump.operator_id)?.operator?.name ?? "?";
            return (
              <div key={dump.id} className="flex flex-wrap items-center justify-between gap-(--space-4) border-t border-line py-(--space-3) last:border-b text-sm">
                <span className="text-black">{operatorName}</span>
                <span className="text-xs text-charcoal/60">{new Date(dump.reported_at).toLocaleString("fr-FR")}</span>
                <span className="text-xs text-charcoal/60">
                  {dump.lat.toFixed(5)}, {dump.lng.toFixed(5)}
                </span>
              </div>
            );
          })}
          {typedDumps.length === 0 ? <p className="py-(--space-3) text-sm text-charcoal/60">Aucun signalement.</p> : null}
        </div>
      </div>
    </div>
  );
}
