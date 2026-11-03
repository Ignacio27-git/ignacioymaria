/** Environment the importer needs, resolved without touching `process.env`. */
export type ImportEnv =
  | {
      ok: true;
      token: string;
      /** `IMPORT_DB_URL`, or null in a dry run that has none. Never `SUPABASE_DB_URL`. */
      dbUrl: string | null;
      /** Every value that must never be printed, logged or reported. */
      secrets: string[];
    }
  | { ok: false; error: string };

type EnvSource = Readonly<Record<string, string | undefined>>;

/** Only the host (and port): user and password never reach a log line. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "(unparseable URL)";
  }
}

function passwordsOf(url: string): string[] {
  try {
    const raw = new URL(url).password;
    if (raw === "") return [];
    const decoded = decodeURIComponent(raw);
    return decoded === raw ? [raw] : [decoded, raw];
  } catch {
    return [];
  }
}

/**
 * Token is always required. The database URL is `IMPORT_DB_URL` only (the
 * importer never reads `SUPABASE_DB_URL`, which stays the local E2E database):
 * required for a real run, optional for a dry run.
 */
export function resolveImportEnv(env: EnvSource, dryRun: boolean): ImportEnv {
  const token = env.TMDB_READ_ACCESS_TOKEN;
  if (!token) {
    return { ok: false, error: "TMDB_READ_ACCESS_TOKEN is missing (set it in .env.local)" };
  }
  const dbUrl = env.IMPORT_DB_URL ? env.IMPORT_DB_URL : null;
  if (!dryRun && dbUrl === null) {
    return { ok: false, error: "IMPORT_DB_URL is missing (set it in .env.local)" };
  }
  const secrets = dbUrl === null ? [token] : [token, dbUrl, ...passwordsOf(dbUrl)];
  return { ok: true, token, dbUrl, secrets };
}
