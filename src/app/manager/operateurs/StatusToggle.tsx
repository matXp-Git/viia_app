"use client";

import { useTransition } from "react";
import { setOperatorStatus } from "../actions";
import type { OperatorStatus } from "@/lib/types";

export function StatusToggle({ operatorId, status }: { operatorId: string; status: OperatorStatus }) {
  const [pending, startTransition] = useTransition();
  const next: OperatorStatus = status === "active" ? "inactive" : "active";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setOperatorStatus(operatorId, next))}
      className="text-xs uppercase tracking-label text-charcoal/60 underline decoration-line underline-offset-2 focus-ring disabled:opacity-40"
    >
      {status === "active" ? "Désactiver" : "Réactiver"}
    </button>
  );
}
