import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link landing. Only `type=email` with a `token_hash` is accepted.
 * Success goes to the root; anything else goes to /login with no query. There
 * is deliberately no `next` parameter, so there is no open redirect.
 */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (tokenHash && type === "email" && (await verify(tokenHash))) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  return NextResponse.redirect(new URL("/login", request.url), 302);
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
