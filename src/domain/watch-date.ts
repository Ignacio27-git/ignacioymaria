import { err, ok, type Result } from "./result";

export type WatchDate =
  | { readonly kind: "known"; readonly date: string }
  | { readonly kind: "unknown" };

export type WatchDateError = { code: "invalid_date" };

export const UNKNOWN_WATCH_DATE: WatchDate = { kind: "unknown" };

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealCalendarDate(date: string): boolean {
  const match = ISO_DAY.exec(date);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

export function parseWatchDate(
  input: unknown,
): Result<WatchDate, WatchDateError> {
  if (typeof input === "object" && input !== null && !Array.isArray(input)) {
    const { kind, date } = input as Record<string, unknown>;
    if (kind === "unknown") return ok(UNKNOWN_WATCH_DATE);
    if (kind === "known" && typeof date === "string" && isRealCalendarDate(date)) {
      return ok({ kind: "known", date });
    }
  }
  return err({ code: "invalid_date" });
}
