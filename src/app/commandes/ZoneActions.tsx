"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteZoneAction, duplicateZoneAction } from "./actions";

type Props = {
  zoneId: string;
  zoneName: string;
  locked: boolean;
  clientQuery: string;
};

const linkClass =
  "text-xs uppercase tracking-label text-muted underline decoration-divider underline-offset-2 focus-ring hover:text-heading";
const disabledClass = "text-xs uppercase tracking-label text-muted opacity-40";

export function ZoneActions({ zoneId, zoneName, locked, clientQuery }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDuplicate() {
    setError(null);
    startTransition(async () => {
      const result = await duplicateZoneAction(zoneId);
      if (result.error || !result.zoneId) {
        setError(result.error ?? "Duplication impossible.");
        return;
      }
      router.push(`/commandes/zones/${result.zoneId}${clientQuery}`);
    });
  }

  function handleDelete() {
    if (!confirm(`Supprimer la zone « ${zoneName} » ?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteZoneAction(zoneId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-(--space-1)">
      <div className="flex flex-wrap items-center justify-end gap-(--space-4)">
        <Link href={`/commandes/zones/${zoneId}/commander${clientQuery}`} className="text-xs font-bold uppercase tracking-label text-heading underline decoration-divider underline-offset-2 focus-ring hover:decoration-heading">
          Commander
        </Link>
        {locked ? (
          <span className={disabledClass} title="Zone liée à une commande : non modifiable">
            Modifier
          </span>
        ) : (
          <Link href={`/commandes/zones/${zoneId}${clientQuery}`} className={linkClass}>
            Modifier
          </Link>
        )}
        <button type="button" onClick={handleDuplicate} disabled={pending} className={`${linkClass} disabled:opacity-40`}>
          Dupliquer
        </button>
        {locked ? (
          <span className={disabledClass} title="Zone liée à une commande : non supprimable">
            Supprimer
          </span>
        ) : (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="text-xs uppercase tracking-label text-critical focus-ring disabled:opacity-40"
          >
            Supprimer
          </button>
        )}
      </div>
      {error ? <p className="max-w-[46ch] text-right text-xs text-critical">{error}</p> : null}
    </div>
  );
}
