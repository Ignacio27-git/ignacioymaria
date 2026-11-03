"use client";

import { useActionState } from "react";

import { requestMagicLinkAction } from "@/app/_actions/auth";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { SignInState } from "@/server/auth/send-magic-link";

const MESSAGES: Record<Exclude<SignInState["status"], "idle">, string> = {
  invalid: "Introduce un correo válido",
  // Same text for every outcome: it must not reveal whether the email is
  // allowed to sign in.
  sent: "Si este correo puede entrar, te llegará un enlace.",
};

const INITIAL_STATE: SignInState = { status: "idle" };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    requestMagicLinkAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <TextField
        label="Correo electrónico"
        name="email"
        type="email"
        autoComplete="email"
      />
      <Button type="submit" disabled={isPending} aria-busy={isPending}>
        Enviar enlace
      </Button>
      {state.status !== "idle" && (
        <p role="status" className="text-ink">
          {MESSAGES[state.status]}
        </p>
      )}
    </form>
  );
}
