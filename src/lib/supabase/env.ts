import "server-only";

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getPublicSupabaseEnv(): {
  url: string;
  publishableKey: string;
} {
  return {
    url: required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    publishableKey: required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}

/** Server-only site origin (no trailing slash) used for magic-link redirects. */
export function getSiteUrl(): string {
  return required("SITE_URL", process.env.SITE_URL).replace(/\/+$/, "");
}

/** Absolute URL on the configured site, for redirects. */
export function siteUrl(path: string): URL {
  return new URL(path, getSiteUrl());
}
