import "server-only";

import { isPerson, type Person } from "@/domain";
import { createClient } from "@/lib/supabase/server";

/**
 * The person for the current session, resolved by the database
 * (public.current_person()). Null when unmapped, removed from the allowlist,
 * or on any error.
 */
export async function getCurrentPerson(): Promise<Person | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_person");
  if (error) {
    console.error("getCurrentPerson failed", error.code ?? "unknown");
    return null;
  }
  return isPerson(data) ? data : null;
}

/** The only score column a person may write (the database enforces it too). */
export function scoreColumnFor(person: Person): "score_ignacio" | "score_maria" {
  return person === "ignacio" ? "score_ignacio" : "score_maria";
}
