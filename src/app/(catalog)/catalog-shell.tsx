import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { PERSON_LABELS } from "@/domain/person";
import { getCurrentPerson } from "@/server/auth/current-person";
import { readThemePreference } from "@/server/theme/read-preference";

import { AppHeader } from "./app-header";

/**
 * The request-time guard of every catalog screen. A session the database
 * cannot map to a person (for example, removed from the allowlist) goes back
 * to /login, which never redirects back, so there is no loop. The header only
 * exists past the guard; /login lives outside this group.
 */
export async function CatalogShell({ children }: { children: ReactNode }) {
  // Session checks (token expiry uses the clock) must run at request time.
  await connection();
  const person = await getCurrentPerson();
  if (!person) {
    redirect("/login");
  }

  return (
    <>
      <AppHeader
        themePreference={await readThemePreference()}
        personLabel={PERSON_LABELS[person]}
      />
      {children}
    </>
  );
}
