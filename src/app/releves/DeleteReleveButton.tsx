"use client";

import { useTransition } from "react";
import { deleteReleve } from "./actions";

export function DeleteReleveButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Supprimer ce relevé ?")) return;
    startTransition(() => deleteReleve(id));
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
