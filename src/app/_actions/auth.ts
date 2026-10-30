"use server";

import { redirect } from "next/navigation";

import {
  sendMagicLink,
  type SignInState,
} from "@/server/auth/send-magic-link";
import { signOut } from "@/server/auth/sign-out";

/** UI entry for the login form; the logic lives in src/server/auth. */
export async function requestMagicLinkAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = formData.get("email");
  return sendMagicLink(typeof email === "string" ? email : "");
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/login");
}
