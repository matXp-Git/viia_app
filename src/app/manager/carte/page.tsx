import { createClient } from "@/lib/supabase/server";
import type { City, Mission, Operator, TrackSegment, WildDump } from "@/lib/types";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { TrackMap, type TrackFeature, type DumpFeature } from "@/components/map/TrackMap";
import { SelectField, TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

type SearchParams = { from?: string; to?: string; city_id?: string; operator_id?: string };

export default async function CartePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const from = params.from || daysAgoIso(7);
  const to = params.to || todayIso();
  const cityId = params.city_id || "";
  const operatorId = params.operator_id || "";

  const supabase = await createClient();

  const [{ data: cities }, { data: operators }] = await Promise.all([
    supabase.from("city").select("*").order("name"),
    supabase.from("operator").select("*").order("name"),
  ]);

  let missionQuery = supabase.from("mission").select("*, city:city_id(*)").gte("date", from).lte("date", to);
  if (cityId) missionQuery = missionQuery.eq("city_id", cityId);
  const { data: missions } = await missionQuery;

  const missionIds = (missions ?? []).map((m: Mission) => m.id);
  const missionById = new Map(((missions ?? []) as (Mission & { city: City | null })[]).map((m) => [m.id, m]));

  let tracks: TrackFeature[] = [];

  if (missionIds.length > 0) {
    let segmentQuery = supabase.from("track_segment").select("*").in("mission_id", missionIds);
    if (operatorId) segmentQuery = segmentQuery.eq("operator_id", operatorId);
    const { data: segments } = await segmentQuery;

    const segmentIds = (segments ?? []).map((s: TrackSegment) => s.id);

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
              cityName: mission?.city?.name ?? "?",
              date: mission?.date ?? "",
              source: segment.source,
            },
            coordinates: coordsBySegment.get(segment.id) ?? [],
          };
        })
        .filter((t) => t.coordinates.length >= 2);
    }
  }

  let dumps: DumpFeature[] = [];

  if (missionIds.length > 0) {
    let dumpQuery = supabase.from("wild_dump").select("*").in("mission_id", missionIds);
    if (operatorId) dumpQuery = dumpQuery.eq("operator_id", operatorId);
    const { data: wildDumps } = await dumpQuery;

    dumps = ((wildDumps ?? []) as WildDump[]).map((dump) => {
      const mission = missionById.get(dump.mission_id);
      return {
        properties: {
          reference: mission?.reference ?? "—",
          cityName: mission?.city?.name ?? "?",
          date: mission?.date ?? "",
          lat: dump.lat,
          lng: dump.lng,
        },
        coordinate: [dump.lng, dump.lat] as [number, number],
      };
    });
  }

  return (
    <div>
      <Eyebrow>Carte</Eyebrow>
      <h1 className="mt-(--space-2) text-display-sm">Tracés GPS</h1>

      <form method="get" className="mt-(--space-6) flex flex-wrap items-end gap-(--space-4) border border-line p-(--space-4)">
        <TextField label="Du" name="from" type="date" defaultValue={from} />
        <TextField label="Au" name="to" type="date" defaultValue={to} />
        <SelectField label="Ville" name="city_id" defaultValue={cityId}>
          <option value="">Toutes</option>
          {((cities ?? []) as City[]).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Opérateur" name="operator_id" defaultValue={operatorId}>
          <option value="">Tous</option>
          {((operators ?? []) as Operator[]).map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </SelectField>
        <Button type="submit" variant="ghost">
          Filtrer →
        </Button>
      </form>

      <p className="mt-(--space-4) text-xs text-charcoal/60">
        {tracks.length} segment{tracks.length > 1 ? "s" : ""} tracé{tracks.length > 1 ? "s" : ""}
        {dumps.length > 0 ? ` · ${dumps.length} dépôt${dumps.length > 1 ? "s" : ""} sauvage${dumps.length > 1 ? "s" : ""} signalé${dumps.length > 1 ? "s" : ""}` : ""}{" "}
        sur la période.
      </p>

      <div className="mt-(--space-3)">
        <TrackMap tracks={tracks} dumps={dumps} />
      </div>
    </div>
  );
}
