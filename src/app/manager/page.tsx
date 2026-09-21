import { createClient } from "@/lib/supabase/server";
import type { City, Client, Mission, Operator } from "@/lib/types";
import { getLiveMissionIds } from "@/lib/liveActivity";
import { createMission } from "./actions";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CreateMissionForm } from "./CreateMissionForm";
import { MissionCard } from "./MissionCard";
import { AutoRefresh } from "@/components/ui/AutoRefresh";

export default async function ManagerMissionsPage() {
  const supabase = await createClient();

  const [{ data: missions }, { data: cities }, { data: clients }, { data: operators }, { data: assignments }] =
    await Promise.all([
      supabase.from("mission").select("*").order("date", { ascending: false }),
      supabase.from("city").select("*").order("name"),
      supabase.from("client").select("*").order("name"),
      supabase.from("operator").select("*").eq("status", "active").order("name"),
      supabase.from("mission_assignment").select("mission_id, operator_id"),
    ]);

  const inProgressIds = (missions ?? []).filter((m: Mission) => m.status === "in_progress").map((m: Mission) => m.id);
  const liveMissionIds = await getLiveMissionIds(supabase, inProgressIds);

  const cityById = new Map((cities ?? []).map((c: City) => [c.id, c]));
  const clientById = new Map((clients ?? []).map((c: Client) => [c.id, c]));
  const assignedByMission = new Map<string, Set<string>>();
  for (const row of assignments ?? []) {
    const set = assignedByMission.get(row.mission_id) ?? new Set<string>();
    set.add(row.operator_id);
    assignedByMission.set(row.mission_id, set);
  }

  return (
    <div>
      <AutoRefresh />
      <Eyebrow>Missions</Eyebrow>
      <h1 className="mt-(--space-2) text-display-sm">Missions &amp; affectations</h1>

      <div className="mt-(--space-6)">
        <CreateMissionForm cities={(cities ?? []) as City[]} clients={(clients ?? []) as Client[]} action={createMission} />
      </div>

      <div className="mt-(--space-9) flex flex-col gap-(--space-6)">
        {(missions ?? []).map((mission: Mission) => {
          const city = cityById.get(mission.city_id);
          const client = mission.client_id ? clientById.get(mission.client_id) : null;
          const assignedIds = assignedByMission.get(mission.id) ?? new Set<string>();

          return (
            <MissionCard
              key={mission.id}
              mission={mission}
              city={city}
              client={client}
              cities={(cities ?? []) as City[]}
              clients={(clients ?? []) as Client[]}
              operators={(operators ?? []) as Operator[]}
              assignedIds={assignedIds}
              isLive={liveMissionIds.has(mission.id)}
            />
          );
        })}
        {(missions ?? []).length === 0 ? <p className="text-sm text-muted">Aucune mission pour le moment.</p> : null}
      </div>
    </div>
  );
}
