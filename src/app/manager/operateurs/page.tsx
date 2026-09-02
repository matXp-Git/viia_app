import { createClient } from "@/lib/supabase/server";
import type { Operator } from "@/lib/types";
import { Eyebrow, DataLabel } from "@/components/ui/Eyebrow";
import { OperatorStatusBadge } from "@/components/ui/StatusBadge";
import { CreateOperatorForm } from "./CreateOperatorForm";
import { StatusToggle } from "./StatusToggle";

export default async function OperateursPage() {
  const supabase = await createClient();
  const { data: operators } = await supabase.from("operator").select("*").order("name");

  return (
    <div>
      <Eyebrow>Opérateurs</Eyebrow>
      <h1 className="mt-(--space-2) text-display-sm">Opérateurs</h1>

      <div className="mt-(--space-6)">
        <CreateOperatorForm />
      </div>

      <div className="mt-(--space-6) flex flex-col">
        {((operators ?? []) as Operator[]).map((operator) => (
          <div
            key={operator.id}
            className="flex flex-wrap items-center justify-between gap-(--space-4) border-t border-divider py-(--space-3) last:border-b"
          >
            <div>
              <div className="text-sm text-heading">{operator.name}</div>
              <div className="mt-1 text-xs text-muted">
                {operator.contact ?? "—"} · <DataLabel>{operator.matricule}</DataLabel>
              </div>
            </div>
            <div className="flex items-center gap-(--space-4)">
              <OperatorStatusBadge status={operator.status} />
              <StatusToggle operatorId={operator.id} status={operator.status} />
            </div>
          </div>
        ))}
        {(operators ?? []).length === 0 ? <p className="py-(--space-3) text-sm text-muted">Aucun opérateur.</p> : null}
      </div>
    </div>
  );
}
