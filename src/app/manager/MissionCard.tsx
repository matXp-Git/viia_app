import type { City, Client, Mission, Operator } from "@/lib/types";
import { timeSlotLabel } from "@/lib/orders";
import { Button } from "@/components/ui/Button";
import { updateMissionAssignments } from "./actions";
import { MissionHeader } from "./MissionHeader";

type Props = {
  mission: Mission;
  city: City | undefined;
  client: Client | null | undefined;
  cities: City[];
  clients: Client[];
  operators: Operator[];
  assignedIds: Set<string>;
  isLive: boolean;
};

// What the team needs to organize the work: the note, the streets, the time
// slot and the client's remark. Shown in the free space next to the operator
// assignment.
function MissionDetails({ mission }: { mission: Mission }) {
  const streets = mission.streets ?? [];
  return (
    <div className="min-w-0 text-sm">
      <div className="text-2xs uppercase tracking-label text-muted">Détail</div>
      {mission.note ? <p className="mt-(--space-2) font-bold text-heading">{mission.note}</p> : null}
      {streets.length > 0 ? (
        <>
          <div className="mt-(--space-3) text-2xs uppercase tracking-label text-muted">Rues ({streets.length})</div>
          <ol className="mt-(--space-1) max-h-56 list-decimal overflow-y-auto pl-(--space-7) text-heading">
            {streets.map((street, index) => (
              <li key={index}>{street}</li>
            ))}
          </ol>
        </>
      ) : null}
      {mission.time_slot ? (
        <p className="mt-(--space-3) text-xs text-muted">Créneau : {timeSlotLabel[mission.time_slot]}</p>
      ) : null}
      {mission.remark ? <p className="mt-(--space-2) whitespace-pre-line text-body">{mission.remark}</p> : null}
    </div>
  );
}

export function MissionCard({ mission, city, client, cities, clients, operators, assignedIds, isLive }: Props) {
  const boundAction = updateMissionAssignments.bind(null, mission.id);
  const hasDetails = Boolean(mission.note) || (mission.streets ?? []).length > 0 || Boolean(mission.time_slot) || Boolean(mission.remark);

  return (
    <div className="border border-divider p-(--space-5)">
      <MissionHeader mission={mission} city={city} client={client} cities={cities} clients={clients} isLive={isLive} />

      <div
        className={`mt-(--space-4) gap-(--space-6) border-t border-divider pt-(--space-4) ${
          hasDetails ? "grid tablet:grid-cols-[minmax(0,1fr)_minmax(0,380px)]" : ""
        }`}
      >
        <form action={boundAction}>
          <div className="text-2xs uppercase tracking-label text-muted">Opérateurs affectés</div>
          <div className="mt-(--space-2) flex flex-wrap gap-(--space-4)">
            {operators.map((op) => (
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
            {operators.length === 0 ? <span className="text-xs text-muted">Aucun opérateur actif.</span> : null}
          </div>
          {mission.status !== "completed" ? (
            <Button type="submit" variant="ghost" className="mt-(--space-3)">
              Mettre à jour l&apos;affectation
            </Button>
          ) : (
            <p className="mt-(--space-3) text-xs text-muted">Mission terminée — affectation verrouillée.</p>
          )}
        </form>

        {hasDetails ? <MissionDetails mission={mission} /> : null}
      </div>
    </div>
  );
}
