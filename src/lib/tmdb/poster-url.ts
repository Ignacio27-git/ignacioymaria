const POSTER_BASE_URL = "https://image.tmdb.org/t/p/w342";

/**
 * Full poster URL from a stored TMDB poster path, or null when there is none
 * or it is not a valid path (same rule as the domain). Pure and client-safe:
 * the host must match images.remotePatterns in next.config.ts.
 */
export function posterUrl(path: string | null): string | null {
  return typeof path === "string" && path.startsWith("/")
    ? `${POSTER_BASE_URL}${path}`
    : null;
}
