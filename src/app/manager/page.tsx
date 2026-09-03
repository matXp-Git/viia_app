import { createClient } from "@/lib/supabase/server";
import type { City, Client, Mission, Operator } from "@/lib/types";
import { getLiveMissionIds } from "@/lib/liveActivity";
import { createMission, updateMissionAssignments } from "./actions";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CreateMissionForm } from "./CreateMissionForm";
import { MissionHeader } from "./MissionHeader";
import { Button } from "@/components/ui/Button";
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
          const boundAction = updateMissionAssignments.bind(null, mission.id);

          return (
            <div key={mission.id} className="border border-divider p-(--space-5)">
              <MissionHeader
                mission={mission}
                city={city}
                client={client}
                cities={(cities ?? []) as City[]}
                clients={(clients ?? []) as Client[]}
                isLive={liveMissionIds.has(mission.id)}
              />

              <form action={boundAction} className="mt-(--space-4) border-t border-divider pt-(--space-4)">
                <div className="text-2xs uppercase tracking-label text-muted">Opérateurs affectés</div>
                <div className="mt-(--space-2) flex flex-wrap gap-(--space-4)">
                  {(operators ?? []).map((op: Operator) => (
                    <label key={op.id} className="flex items-center gap-(--space-1) text-sm text-heading">
                      <input
                        type="checkbox"
                        name="operator_ids"
                        value={op.id}
                        defaultChecked={assignedIds.has(op.id)}
                        className="accent-[var(--color-accent)]"
                      />
                      {op.name}
                    </label>
                  ))}
                  {(operators ?? []).length === 0 ? (
                    <span className="text-xs text-muted">Aucun opérateur actif.</span>
                  ) : null}
                </div>
                {mission.status !== "completed" ? (
                  <Button type="submit" variant="ghost" className="mt-(--space-3)">
                    Mettre à jour l&apos;affectation
                  </Button>
                ) : (
                  <p className="mt-(--space-3) text-xs text-muted">Mission terminée — affectation verrouillée.</p>
                )}
              </form>
            </div>
          );
        })}
        {(missions ?? []).length === 0 ? <p className="text-sm text-muted">Aucune mission pour le moment.</p> : null}
      </div>
    </div>
  );
}
