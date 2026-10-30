export type TmdbKind = "movie" | "series";

/** Expected failures of a TMDB lookup; nothing here is ever thrown. */
export type TmdbFailure = {
  kind: "not_found" | "unavailable" | "invalid_input" | "unauthorized";
};

export type TmdbCandidate = {
  tmdbId: number;
  kind: TmdbKind;
  /** Localized (es-ES) name, falling back to the original name. */
  name: string;
  year: number | null;
  posterPath: string | null;
};

export type TmdbDetails = Omit<TmdbCandidate, "kind"> & {
  actors: readonly string[];
} & ({ kind: "movie" } | { kind: "series"; seasonsTotal: number | null });
