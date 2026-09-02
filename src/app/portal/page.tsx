import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { MissionStatusBadge } from "@/components/ui/StatusBadge";
import { TrackMap, type TrackFeature, type DumpFeature } from "@/components/map/TrackMap";
import { SelectField, TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { City, MissionStatus, TrackSegment, WildDump } from "@/lib/types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

type MissionTotal = {
  mission_id: string;
  reference: string;
  city_id: string;
  client_id: string | null;
  date: string;
  status: MissionStatus;
  kilos_total: number;
  kilos_recycled: number;
};

type SearchParams = { from?: string; to?: string };

export default async function PortalHome({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const from = params.from || daysAgoIso(30);
  const to = params.to || todayIso();

  const supabase = await createClient();

  const { data: totals } = await supabase.rpc("get_mission_totals", { p_date_from: from, p_date_to: to });
  const missions = (totals ?? []) as MissionTotal[];

  const kilosTotal = missions.reduce((sum, m) => sum + Number(m.kilos_total), 0);
  const kilosRecycled = missions.reduce((sum, m) => sum + Number(m.kilos_recycled), 0);
  const recyclingRate = kilosTotal > 0 ? Math.round((kilosRecycled / kilosTotal) * 100) : null;

  const missionIds = missions.map((m) => m.mission_id);

  let tracks: TrackFeature[] = [];
  let dumps: DumpFeature[] = [];

  if (missionIds.length > 0) {
    const missionById = new Map(missions.map((m) => [m.mission_id, m]));
    const cityIds = [...new Set(missions.map((m) => m.city_id))];

    const [{ data: segments }, { data: wildDumps }, { data: cities }] = await Promise.all([
      supabase.from("track_segment").select("*").in("mission_id", missionIds),
      supabase.from("wild_dump").select("*").in("mission_id", missionIds),
      supabase.from("city").select("*").in("id", cityIds),
    ]);
    const cityById = new Map(((cities ?? []) as City[]).map((c) => [c.id, c]));

    const segmentIds = ((segments ?? []) as TrackSegment[]).map((s) => s.id);

    if (segmentIds.length > 0) {
      const { data: points } = await supabase
        .from("track_point")
        .select("segment_id, lat, lng, recorded_at")
        .in("segment_id", segmentIds)
        .order("recorded_at", { ascending: true });

      const coordsBySegment = new Map<string, [number, number][]>();
      for (const p of points ?? []) {
        const list = coordsBySegment.get(p.segment_id) ?? [];
        list.push([p.lng, p.lat]);
        coordsBySegment.set(p.segment_id, list);
      }

      tracks = ((segments ?? []) as TrackSegment[])
        .map((segment) => {
          const mission = missionById.get(segment.mission_id);
          return {
            properties: {
              missionId: segment.mission_id,
              reference: mission?.reference ?? "—",
              cityName: mission ? (cityById.get(mission.city_id)?.name ?? "?") : "?",
              date: mission?.date ?? "",
              source: segment.source,
            },
            coordinates: coordsBySegment.get(segment.id) ?? [],
          };
        })
        .filter((t) => t.coordinates.length >= 2);
    }

    dumps = ((wildDumps ?? []) as WildDump[]).map((dump) => {
      const mission = missionById.get(dump.mission_id);
      return {
        properties: {
          reference: mission?.reference ?? "—",
          cityName: mission ? (cityById.get(mission.city_id)?.name ?? "?") : "?",
          date: mission?.date ?? "",
          lat: dump.lat,
          lng: dump.lng,
        },
        coordinate: [dump.lng, dump.lat],
      };
    });
  }

  return (
    <main className="mx-auto max-w-(--container-max) px-(--gutter) py-(--space-9)">
      <Eyebrow>Vos missions</Eyebrow>
      <h1 className="mt-(--space-2) text-display-sm">Suivi de collecte</h1>

      <form method="get" className="mt-(--space-6) flex flex-wrap items-end gap-(--space-4) border border-line p-(--space-4)">
        <TextField label="Du" name="from" type="date" defaultValue={from} />
        <TextField label="Au" name="to" type="date" defaultValue={to} />
        <Button type="submit" variant="ghost">
          Filtrer →
        </Button>
      </form>

      <div className="mt-(--space-7) grid grid-cols-3 gap-px border border-line bg-line mobile:grid-cols-1">
        <div className="bg-white p-(--space-4)">
          <div className="text-2xs uppercase text-charcoal/60">Total collecté</div>
          <div className="mt-(--space-2) text-sm font-bold text-black">{kilosTotal.toFixed(1)} kg</div>
        </div>
        <div className="bg-white p-(--space-4)">
          <div className="text-2xs uppercase text-charcoal/60">Dont recyclé</div>
          <div className="mt-(--space-2) text-sm font-bold text-black">{kilosRecycled.toFixed(1)} kg</div>
        </div>
        <div className="bg-white p-(--space-4)">
          <div className="text-2xs uppercase text-charcoal/60">Taux de recyclage</div>
          <div className="mt-(--space-2) text-sm font-bold text-black">{recyclingRate !== null ? `${recyclingRate}%` : "—"}</div>
        </div>
      </div>

      <div className="mt-(--space-7)">
        <Eyebrow>Carte</Eyebrow>
        <div className="mt-(--space-3)">
          <TrackMap tracks={tracks} dumps={dumps} />
        </div>
      </div>

      <div className="mt-(--space-7)">
        <Eyebrow>Missions</Eyebrow>
        <div className="mt-(--space-3) flex flex-col">
          {missions.map((mission) => (
            <div
              key={mission.mission_id}
              className="flex flex-wrap items-center justify-between gap-(--space-4) border-t border-line py-(--space-3) last:border-b"
            >
              <div>
                <div className="text-sm font-bold text-black">{mission.reference}</div>
                <div className="mt-1 text-xs text-charcoal/60">{mission.date}</div>
              </div>
              <div className="flex items-center gap-(--space-4)">
                <span className="text-sm text-black">
                  {Number(mission.kilos_total).toFixed(1)} kg
                  <span className="ml-(--space-2) text-xs text-charcoal/60">
                    ({Number(mission.kilos_recycled).toFixed(1)} kg recyclé)
                  </span>
                </span>
                <MissionStatusBadge status={mission.status} />
              </div>
            </div>
          ))}
          {missions.length === 0 ? <p className="py-(--space-3) text-sm text-charcoal/60">Aucune mission sur la période.</p> : null}
        </div>
      </div>
    </main>
  );
}
