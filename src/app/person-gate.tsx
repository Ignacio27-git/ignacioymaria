import { redirect } from "next/navigation";

import { PERSON_LABELS } from "@/domain";
import { getCurrentPerson } from "@/server/auth/current-person";

/**
 * Resolves the signed-in person. A session the database cannot map to a person
 * (for example, removed from the allowlist) goes back to /login, which never
 * redirects back, so there is no loop.
 */
export async function PersonGate() {
  const person = await getCurrentPerson();
  if (!person) {
    redirect("/login");
  }

  return <p>Sesión iniciada como {PERSON_LABELS[person]}</p>;
}
