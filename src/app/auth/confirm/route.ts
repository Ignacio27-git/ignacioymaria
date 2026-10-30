import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { siteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link landing. Only `type=email` with a `token_hash` is accepted.
 * Redirects use the configured SITE_URL: Next rewrites 127.0.0.1 to localhost
 * in request.url, which would drop the session cookie host.
 * Success goes to the root; anything else goes to /login with no query. There
 * is deliberately no `next` parameter, so there is no open redirect.
 */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (tokenHash && type === "email" && (await verify(tokenHash))) {
    return NextResponse.redirect(siteUrl("/"), 302);
  }

  return NextResponse.redirect(siteUrl("/login"), 302);
}

async function verify(tokenHash: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: "email",
      token_hash: tokenHash,
    });
    if (error) {
      console.error("auth confirm failed", error.code ?? "unknown");
    }
    return !error;
  } catch {
    console.error("auth confirm failed", "exception");
    return false;
  }
}
