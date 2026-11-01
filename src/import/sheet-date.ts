import { UNKNOWN_WATCH_DATE, type WatchDate } from "../domain/watch-date";
import type { Note } from "./types";

export type SheetDateResult = { watchDate: WatchDate; note: Note | null };

/** The only text form interpreted: dd/mm directly followed by a 4-digit year. */
const TYPO_DATE = /^(\d{2})\/(\d{2})(\d{4})$/;

const pad = (n: number) => String(n).padStart(2, "0");

function isoOf(year: number, month: number, day: number): string | null {
  const utc = new Date(Date.UTC(year, month - 1, day));
  const real =
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day;
  return real ? `${year}-${pad(month)}-${pad(day)}` : null;
}

function unknownWith(original: string): SheetDateResult {
  return {
    watchDate: UNKNOWN_WATCH_DATE,
    note: { reason: "date", original, decision: "unknown" },
  };
}

/** Number format reduced to its date tokens (quoted text and [..] removed). */
function formatTokens(format: string): string {
  return format.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "").toLowerCase();
}

/**
 * Column E to a watch date. Dates are read with UTC getters, so the result does
 * not depend on the machine timezone. Nothing is ever invented.
 */
export function parseSheetDate(
  value: Date | number | string | null,
  format: string | null,
): SheetDateResult {
  if (value === null) return { watchDate: UNKNOWN_WATCH_DATE, note: null };

  if (value instanceof Date) {
    const original = Number.isNaN(value.getTime())
      ? "invalid date"
      : value.toISOString().slice(0, 10);
    if (Number.isNaN(value.getTime())) return unknownWith(original);

    const year = value.getUTCFullYear();
    const month = value.getUTCMonth() + 1;
    const day = value.getUTCDate();
    const tokens = format === null ? "d" : formatTokens(format);
    if (tokens.includes("d")) {
      const date = isoOf(year, month, day);
      return date === null
        ? unknownWith(original)
        : { watchDate: { kind: "known", date }, note: null };
    }
    if (tokens.includes("m") && tokens.includes("y")) {
      const date = isoOf(year, month, 1);
      if (date === null) return unknownWith(original);
      return {
        watchDate: { kind: "known", date },
        note: {
          reason: "date",
          original: `${pad(month)}/${year}`,
          decision: `month precision only, day 1 used (${date})`,
        },
      };
    }
    return unknownWith(`${original} (format ${format})`);
  }

  if (typeof value === "string") {
    const text = value.trim();
    if (text === "") return { watchDate: UNKNOWN_WATCH_DATE, note: null };
    const typo = TYPO_DATE.exec(text);
    if (typo) {
      const date = isoOf(Number(typo[3]), Number(typo[2]), Number(typo[1]));
      if (date !== null) {
        return {
          watchDate: { kind: "known", date },
          note: { reason: "date", original: text, decision: `interpreted as ${date}` },
        };
      }
    }
    return unknownWith(text);
  }

  return unknownWith(String(value));
}
