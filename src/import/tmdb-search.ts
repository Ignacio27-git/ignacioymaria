import type { MatchCandidate } from "./types";

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function yearOf(date: unknown): number | null {
  const prefix = text(date)?.slice(0, 4);
  return prefix && /^\d{4}$/.test(prefix) ? Number(prefix) : null;
}

/**
 * search/multi payload to match candidates. Unlike the app's mapper it keeps
 * the localized AND the original names, because the sheet may use either.
 */
export function mapSearchMulti(payload: unknown): MatchCandidate[] {
  if (!isObject(payload) || !Array.isArray(payload.results)) return [];
  const candidates: MatchCandidate[] = [];
  for (const item of payload.results as unknown[]) {
    if (!isObject(item)) continue;
    const kind =
      item.media_type === "movie"
        ? "movie"
        : item.media_type === "tv"
          ? "series"
          : null;
    if (kind === null) continue;
    const id = item.id;
    if (!Number.isInteger(id) || (id as number) < 1) continue;

    const rawNames =
      kind === "movie"
        ? [item.title, item.original_title]
        : [item.name, item.original_name];
    const names = [
      ...new Set(rawNames.map(text).filter((n): n is string => n !== null)),
    ];
    if (names.length === 0) continue;

    candidates.push({
      tmdbId: id as number,
      kind,
      names,
      year: yearOf(kind === "movie" ? item.release_date : item.first_air_date),
    });
  }
  return candidates;
}
