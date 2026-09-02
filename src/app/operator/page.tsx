import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAppUser } from "@/lib/supabase/session";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { MissionStatusBadge } from "@/components/ui/StatusBadge";
import type { City, Client, Mission, MissionStatus } from "@/lib/types";

type Row = {
  mission: (Mission & { city: City | null; client: Client | null }) | null;
};

export default async function OperatorHome() {
  const appUser = await getAppUser();
  if (!appUser?.operator_id) return null; // layout redirect is in flight

  const supabase = await createClient();

  // No date filter: a mission can run over several days/sessions, so it
  // stays in the list until the manager marks it completed.
  const { data } = await supabase
    .from("mission_assignment")
    .select("mission:mission_id!inner(*, city:city_id(*), client:client_id(*))")
    .eq("operator_id", appUser.operator_id)
    .neq("mission.status", "completed")
    .order("date", { referencedTable: "mission", ascending: true });

  const rows = (data ?? []) as unknown as Row[];

  return (
    <main className="mx-auto max-w-(--container-max) px-(--gutter) py-(--space-9)">
      <Eyebrow>App opérateur</Eyebrow>
      <h1 className="mt-(--space-2) text-display-sm">Mes missions</h1>

      <div className="mt-(--space-6) flex flex-col">
        {rows.map(({ mission }) => {
          if (!mission) return null;
          return (
            <Link
              key={mission.id}
              href={`/operator/missions/${mission.id}`}
              className="flex items-center justify-between gap-(--space-4) border-t border-line py-(--space-4) last:border-b focus-ring"
            >
              <div>
                <div className="text-sm font-bold text-black">{mission.reference ?? "—"}</div>
                <div className="mt-1 text-xs text-charcoal/60">
                  {mission.city?.name ?? "?"} {mission.client ? `· ${mission.client.name}` : ""} · {mission.date}
                </div>
              </div>
              <MissionStatusBadge status={mission.status as MissionStatus} />
            </Link>
          );
        })}
        {rows.length === 0 ? <p className="py-(--space-3) text-sm text-charcoal/60">Aucune mission en cours.</p> : null}
      </div>
    </main>
  );
}
