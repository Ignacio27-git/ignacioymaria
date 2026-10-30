import type { TitleFailure } from "./types";

/** The part of a PostgREST error the mapping needs. */
export interface PostgrestLike {
  code?: string;
  message?: string;
}

/**
 * Maps a PostgREST/Postgres error to a typed failure. Logs the code only,
 * never the message, which can carry row data (D-32).
 */
export function mapPostgrestError(error: PostgrestLike): TitleFailure {
  switch (error.code) {
    case "23505":
      return { kind: "duplicate", existingId: null };
    case "42501":
      return { kind: "forbidden" };
    case "PGRST116":
      return { kind: "not_found" };
    default:
      console.error("titles query failed", error.code ?? "unknown");
      return { kind: "unavailable" };
  }
}
