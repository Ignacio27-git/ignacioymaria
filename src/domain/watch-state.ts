export const WATCH_STATES = [
  "urgent",
  "watched",
  "watched_rewatch",
  "watched_no_rewatch",
  "watched_awful",
  "pending",
] as const;

export type WatchState = (typeof WATCH_STATES)[number];

/** Display labels: the exact color legend of the Excel sheet. */
export const WATCH_STATE_LABELS: Readonly<Record<WatchState, string>> = {
  urgent: "Urgente de ver",
  watched: "Vista",
  watched_rewatch: "Vista, repetir",
  watched_no_rewatch: "Vista, no repetir",
  watched_awful: "Vista y horrible",
  pending: "Pendiente",
};

export const DEFAULT_WATCH_STATE: WatchState = "pending";

export function isWatchState(value: unknown): value is WatchState {
  return (
    typeof value === "string" &&
    (WATCH_STATES as readonly string[]).includes(value)
  );
}
