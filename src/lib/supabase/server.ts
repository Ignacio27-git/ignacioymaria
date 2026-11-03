import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicSupabaseEnv } from "./env";

/** Supabase client bound to the current request cookies (server only). */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getPublicSupabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies; src/proxy.ts refreshes
          // the session on every request, so this is safe to ignore.
        }
      },
    },
  });
}
