"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { ClientOrder } from "@/lib/types";
import { formatEuro, priceModeLabel } from "@/lib/pricing";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { setOrderFinalAmount } from "../../actions";

export function FinalAmountForm({ order, missionId }: { order: ClientOrder; missionId: string }) {
  const mode = priceModeLabel(order.price_mode);
  const [value, setValue] = useState(order.final_amount === null ? "" : String(order.final_amount));
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await setOrderFinalAmount(order.id, missionId, value);
      setMessage(result.error ? { text: result.error, isError: true } : { text: "Enregistré.", isError: false });
    });
  }

  return (
    <div className="border border-divider p-(--space-4)">
      <div className="text-2xs uppercase tracking-label text-muted">Prix ({mode})</div>
      <div className="mt-(--space-2) text-sm text-body">
        Estimation : <span className="font-bold text-heading">{formatEuro(order.estimated_amount)}</span> (
        {order.street_count} rue{order.street_count > 1 ? "s" : ""} × {formatEuro(order.unit_price)})
      </div>
      <p className="mt-(--space-1) text-xs text-muted">
        Forfait de {formatEuro(order.discontinuity_fee)} par coupure entre rues non contiguës, à ajouter au montant final.
      </p>

      <div className="mt-(--space-4) flex flex-wrap items-end gap-(--space-3)">
        <TextField
          label={`Montant final ${mode} (€)`}
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Vide = estimation"
          className="max-w-[220px]"
        />
        <Button type="button" variant="ghost" onClick={save} disabled={pending}>
          {pending ? "..." : "Enregistrer"}
        </Button>
      </div>
      {message ? <p className={`mt-(--space-2) text-xs ${message.isError ? "text-critical" : "text-success"}`}>{message.text}</p> : null}

      <Link
        href={`/commandes/bon/${order.id}?client=${order.client_id}`}
        className="mt-(--space-4) inline-block text-xs uppercase tracking-label text-muted underline decoration-divider underline-offset-2 hover:text-heading"
      >
        Voir le bon de commande →
      </Link>
    </div>
  );
}
