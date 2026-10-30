import "server-only";

import { getSiteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type SignInState = { status: "idle" | "invalid" | "sent" };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends a magic link. Every outcome after validation is reported as "sent":
 * the allowlist hook, rate limits and provider errors must be
 * indistinguishable to the caller (no account enumeration). Failures are
 * logged by error code only, never by provider text.
 */
export async function sendMagicLink(rawEmail: string): Promise<SignInState> {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return { status: "invalid" };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${getSiteUrl()}/auth/confirm`,
        shouldCreateUser: true,
      },
    });
    if (error) {
      console.error("sendMagicLink failed", error.code ?? "unknown");
    }
  } catch {
    console.error("sendMagicLink failed", "exception");
  }

  return { status: "sent" };
}
