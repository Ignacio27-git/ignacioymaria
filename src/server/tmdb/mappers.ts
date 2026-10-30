import type { TmdbCandidate, TmdbDetails, TmdbKind } from "./types";

/** Pure mapping from TMDB JSON to our DTOs. Every input is untrusted. */

const MAX_ACTORS = 10;

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function kindOf(mediaType: unknown): TmdbKind | null {
  if (mediaType === "movie") return "movie";
  if (mediaType === "tv") return "series";
  return null;
}

function nameOf(kind: TmdbKind, item: Json): string | null {
  return kind === "movie"
    ? (text(item.title) ?? text(item.original_title))
    : (text(item.name) ?? text(item.original_name));
}

function yearOf(kind: TmdbKind, item: Json): number | null {
  const date = text(kind === "movie" ? item.release_date : item.first_air_date);
  const prefix = date?.slice(0, 4);
  return prefix && /^\d{4}$/.test(prefix) ? Number(prefix) : null;
}

function posterOf(item: Json): string | null {
  const path = item.poster_path;
  return typeof path === "string" && path.startsWith("/") ? path : null;
}

function idOf(item: Json): number | null {
  const id = item.id;
  return Number.isInteger(id) && (id as number) >= 1 ? (id as number) : null;
}

function candidateOf(kind: TmdbKind, item: Json) {
  const tmdbId = idOf(item);
  const name = nameOf(kind, item);
  if (tmdbId === null || name === null) return null;
  return {
    tmdbId,
    name,
    year: yearOf(kind, item),
    posterPath: posterOf(item),
  };
}

export function mapSearchResults(payload: unknown): TmdbCandidate[] {
  if (!isObject(payload) || !Array.isArray(payload.results)) return [];
  const candidates: TmdbCandidate[] = [];
  for (const item of payload.results as unknown[]) {
    if (!isObject(item)) continue;
    const kind = kindOf(item.media_type);
    if (kind === null) continue;
    const base = candidateOf(kind, item);
    if (base) candidates.push({ ...base, kind });
  }
  return candidates;
}

function actorsOf(payload: Json): string[] {
  const credits = payload.credits;
  if (!isObject(credits) || !Array.isArray(credits.cast)) return [];
  return (credits.cast as unknown[])
    .filter(isObject)
    .filter((member) => text(member.name) !== null)
    .sort((a, b) => orderOf(a) - orderOf(b))
    .slice(0, MAX_ACTORS)
    .map((member) => member.name as string);
}

function orderOf(member: Json): number {
  return typeof member.order === "number" ? member.order : Infinity;
}

/** Null when the payload has no usable id or name (treated as unavailable). */
export function mapDetails(kind: TmdbKind, payload: unknown): TmdbDetails | null {
  if (!isObject(payload)) return null;
  const base = candidateOf(kind, payload);
  if (!base) return null;
  const actors = actorsOf(payload);
  if (kind === "movie") return { ...base, kind, actors };
  const seasons = payload.number_of_seasons;
  const seasonsTotal =
    Number.isInteger(seasons) && (seasons as number) >= 1
      ? (seasons as number)
      : null;
  return { ...base, kind, actors, seasonsTotal };
}
