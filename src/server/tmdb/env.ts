import "server-only";

/**
 * The TMDB read access token (Bearer), or null when unset or blank. Null lets
 * the lookup answer `unavailable` instead of throwing (D-42). This is the only
 * place that reads the variable.
 */
export function getTmdbReadAccessToken(): string | null {
  const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  return token ? token : null;
}
