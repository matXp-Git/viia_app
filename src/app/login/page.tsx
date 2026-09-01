"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <main className="mx-auto flex min-h-screen max-w-[360px] flex-col justify-center px-(--gutter)">
      <p className="text-xs tracking-eyebrow text-charcoal/60">ViiA Pick</p>
      <h1 className="mt-(--space-2) text-display-sm">Connexion</h1>
      <form action={formAction} className="mt-(--space-6) flex flex-col gap-(--space-4)">
        <TextField label="Email" name="email" type="email" autoComplete="email" required />
        <TextField label="Mot de passe" name="password" type="password" autoComplete="current-password" required />
        {state.error ? <p className="text-xs text-critical">{state.error}</p> : null}
        <Button type="submit" disabled={pending} className="mt-(--space-2)">
          {pending ? "Connexion..." : "Se connecter →"}
        </Button>
      </form>
    </main>
  );
}
