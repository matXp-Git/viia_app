"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { updatePassword } from "./actions";

export function PasswordForm() {
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  // Handled manually (instead of a form action) so a typo doesn't wipe both
  // fields: they're only cleared once the change succeeded.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setMessage(null);
    startTransition(async () => {
      const result = await updatePassword({}, formData);
      if (result.error) {
        setMessage({ text: result.error, isError: true });
        return;
      }
      form.reset();
      setMessage({ text: "Mot de passe modifié.", isError: false });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-(--space-4) border border-divider p-(--space-4)">
      <TextField
        label="Nouveau mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <TextField
        label="Confirmer"
        name="confirm"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      {message ? (
        <p className={`w-full text-xs ${message.isError ? "text-critical" : "text-success"}`}>{message.text}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement..." : "Changer le mot de passe →"}
      </Button>
    </form>
  );
}
