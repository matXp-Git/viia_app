"use client";

import { useTransition } from "react";
import { deleteReport } from "./actions";

export function DeleteReportButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Supprimer ce rapport et ses photos ? Le lien public cessera de fonctionner.")) return;
    startTransition(() => deleteReport(id));
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="text-xs uppercase tracking-label text-critical focus-ring disabled:opacity-40"
    >
      Suppr.
    </button>
  );
}
