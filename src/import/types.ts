/** Raw values of one named `Pelis` row, as read by the script (no rules applied). */
export type RawRow = {
  /** 1-based sheet row number, for the report. */
  row: number;
  name: string | number;
  fillArgb: string | null;
  scoreMaria: unknown;
  scoreIgnacio: unknown;
  watchDate: Date | number | string | null;
  watchDateFormat: string | null;
  year: number | string | null;
  actors: string;
  observations: string | null;
};

export type NoteReason =
  | "off_legend"
  | "score"
  | "date"
  | "season"
  | "duplicate"
  | "unlinked"
  | "conflict"
  | "kind";

/** One thing a rule decided that the people should review. */
export type Note = {
  reason: NoteReason;
  original: string;
  decision: string;
};

export type ReportNote = Note & { row: number; name: string };

export type MatchKind = "movie" | "series";

export type MatchCandidate = {
  tmdbId: number;
  kind: MatchKind;
  /** Localized and original names, all compared folded. */
  names: string[];
  year: number | null;
};
