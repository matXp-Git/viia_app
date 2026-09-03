import type { createClient } from "@/lib/supabase/server";

// A mission counts as "live" (pulsing on the manager dashboard) if any of
// its segments recorded a GPS point in the last 30s — roughly 7-8 points
// at the operator app's 4s recording cadence, comfortably inside the
// window even accounting for network jitter.
export const LIVE_WINDOW_MS = 30_000;

export function isRecentlyActive(isoTimestamp: string | null): boolean {
  if (!isoTimestamp) return false;
  return Date.now() - new Date(isoTimestamp).getTime() < LIVE_WINDOW_MS;
}

export async function getLiveMissionIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  missionIds: string[],
): Promise<Set<string>> {
  const live = new Set<string>();
  if (missionIds.length === 0) return live;

  const { data: segments } = await supabase.from("track_segment").select("id, mission_id").in("mission_id", missionIds);

  const segToMission = new Map((segments ?? []).map((s) => [s.id as string, s.mission_id as string]));
  const segIds = [...segToMission.keys()];
  if (segIds.length === 0) return live;

  const { data: points } = await supabase
    .from("track_point")
    .select("segment_id, recorded_at")
    .in("segment_id", segIds)
    .order("recorded_at", { ascending: false })
    .limit(300);

  const now = Date.now();
  const seenMissions = new Set<string>();
  for (const p of points ?? []) {
    const missionId = segToMission.get(p.segment_id);
    if (!missionId || seenMissions.has(missionId)) continue;
    seenMissions.add(missionId);
    if (now - new Date(p.recorded_at).getTime() < LIVE_WINDOW_MS) {
      live.add(missionId);
    }
  }
  return live;
}
