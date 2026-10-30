"use client";

import { useActionState } from "react";

import { requestMagicLinkAction } from "@/app/_actions/auth";
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
    <form action={formAction} noValidate>
      <label htmlFor="email">Correo electrónico</label>
      <input id="email" name="email" type="email" autoComplete="email" />
      <button type="submit" disabled={isPending}>
        Enviar enlace
      </button>
      {state.status !== "idle" && <p role="status">{MESSAGES[state.status]}</p>}
    </form>
  );
}
