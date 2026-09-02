const base = "inline-flex w-fit items-center justify-center px-(--space-3) py-1 text-2xs uppercase tracking-label";

export type MissionStatus = "planned" | "in_progress" | "completed";
export type OperatorStatus = "active" | "inactive";

const missionLabel: Record<MissionStatus, string> = {
  planned: "Planifiée",
  in_progress: "En cours",
  completed: "Terminée",
};

const missionStyle: Record<MissionStatus, string> = {
  planned: "border border-divider text-muted",
  in_progress: "bg-accent/70 text-accent-text",
  completed: "bg-success-bg text-success",
};

const operatorLabel: Record<OperatorStatus, string> = {
  active: "Actif",
  inactive: "Inactif",
};

const operatorStyle: Record<OperatorStatus, string> = {
  active: "bg-success-bg text-success",
  inactive: "border border-divider text-muted opacity-70",
};

export function MissionStatusBadge({ status }: { status: MissionStatus }) {
  return <span className={`${base} ${missionStyle[status]}`}>{missionLabel[status]}</span>;
}

export function OperatorStatusBadge({ status }: { status: OperatorStatus }) {
  return <span className={`${base} ${operatorStyle[status]}`}>{operatorLabel[status]}</span>;
}
