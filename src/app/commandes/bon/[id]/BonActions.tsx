"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { emailOrderCopyAction } from "../../actions";

const messages = {
  sent: "Copie envoyée par e-mail.",
  skipped: "L'envoi d'e-mail n'est pas disponible pour le moment.",
  failed: "L'e-mail n'a pas pu être envoyé.",
  missing: "Bon de commande introuvable.",
} as const;

export function BonActions({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function sendCopy() {
    setMessage(null);
    startTransition(async () => {
      const { status } = await emailOrderCopyAction(orderId);
      setMessage(messages[status]);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-(--space-4) print:hidden">
      {message ? <span className="text-xs text-muted">{message}</span> : null}
      <Button type="button" variant="ghost" onClick={sendCopy} disabled={pending}>
        {pending ? "Envoi..." : "Recevoir par e-mail"}
      </Button>
      <Button type="button" onClick={() => window.print()}>
        Imprimer / PDF →
      </Button>
    </div>
  );
}
