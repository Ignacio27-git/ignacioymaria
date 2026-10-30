import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Ends the current session. Never throws, so logout always completes. */
export async function signOut(): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("signOut failed", error.code ?? "unknown");
    }
  } catch {
    console.error("signOut failed", "exception");
  }
}
