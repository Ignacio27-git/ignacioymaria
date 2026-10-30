import type { WatchState } from "@/domain/watch-state";

import { AA_LARGE_TEXT, AA_NON_TEXT, AA_TEXT } from "./contrast";

/**
 * Single source of the color tokens (D-48). `src/app/globals.css` mirrors these
 * values as CSS variables; css-sync.test.ts keeps both in step.
 */
export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export type TokenName =
  | "paper"
  | "ink"
  | "inkMuted"
  | "rule"
  | "ruleStrong"
  | "surface"
  | "focus"
  | "inverseBg"
  | "inverseInk"
  | "stateUrgent"
  | "stateWatched"
  | "stateRewatch"
  | "stateNoRewatch"
  | "stateAwful";

export const TOKENS: Readonly<
  Record<Theme, Readonly<Record<TokenName, string>>>
> = {
  light: {
    paper: "#f4f4f1",
    ink: "#131313",
    inkMuted: "#5c5b57",
    rule: "#d6d5cf",
    ruleStrong: "#858480",
    surface: "#eaeae5",
    focus: "#131313",
    inverseBg: "#131313",
    inverseInk: "#f4f4f1",
    stateUrgent: "#c8352b",
    stateWatched: "#2f7d4a",
    stateRewatch: "#b07a10",
    stateNoRewatch: "#8a6bbf",
    stateAwful: "#2f5fb3",
  },
  dark: {
    paper: "#111214",
    ink: "#ebe9e4",
    inkMuted: "#96948f",
    rule: "#2a2b2e",
    ruleStrong: "#6b6c70",
    surface: "#1b1c1f",
    focus: "#ebe9e4",
    inverseBg: "#ebe9e4",
    inverseInk: "#111214",
    stateUrgent: "#e5594d",
    stateWatched: "#4fae6f",
    stateRewatch: "#d9a23a",
    stateNoRewatch: "#b29be0",
    stateAwful: "#5b8fe0",
  },
};

/** CSS variable name (without `--`) for a token: `inkMuted` -> `ink-muted`. */
export function cssVarName(token: TokenName): string {
  return token.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export type StateSwatch =
  | { kind: "fill"; token: TokenName }
  | { kind: "outline"; token: "ruleStrong" };

/** Painted cell per watch state; `pending` is an empty outline (no fill). */
export const STATE_SWATCHES: Readonly<Record<WatchState, StateSwatch>> = {
  urgent: { kind: "fill", token: "stateUrgent" },
  watched: { kind: "fill", token: "stateWatched" },
  watched_rewatch: { kind: "fill", token: "stateRewatch" },
  watched_no_rewatch: { kind: "fill", token: "stateNoRewatch" },
  watched_awful: { kind: "fill", token: "stateAwful" },
  pending: { kind: "outline", token: "ruleStrong" },
};

export type ContrastKind = "text" | "large-text" | "non-text";

export interface ContrastPair {
  id: string;
  fg: TokenName;
  bg: TokenName;
  kind: ContrastKind;
  min: number;
}

const MIN_BY_KIND: Readonly<Record<ContrastKind, number>> = {
  text: AA_TEXT,
  "large-text": AA_LARGE_TEXT,
  "non-text": AA_NON_TEXT,
};

function pair(
  id: string,
  fg: TokenName,
  bg: TokenName,
  kind: ContrastKind,
): ContrastPair {
  return { id, fg, bg, kind, min: MIN_BY_KIND[kind] };
}

/** Every foreground/background combination the components rely on (R2). */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  pair("body text", "ink", "paper", "text"),
  pair("body text on hover surface", "ink", "surface", "text"),
  pair("muted text", "inkMuted", "paper", "text"),
  pair("muted text on hover surface", "inkMuted", "surface", "text"),
  pair("average figure", "inverseInk", "inverseBg", "large-text"),
  pair("masthead", "ink", "paper", "large-text"),
  pair("focus ring", "focus", "paper", "non-text"),
  pair("strong rule and pending outline", "ruleStrong", "paper", "non-text"),
  pair("urgent swatch", "stateUrgent", "paper", "non-text"),
  pair("watched swatch", "stateWatched", "paper", "non-text"),
  pair("rewatch swatch", "stateRewatch", "paper", "non-text"),
  pair("no-rewatch swatch", "stateNoRewatch", "paper", "non-text"),
  pair("awful swatch", "stateAwful", "paper", "non-text"),
];

/** True when a source file references the inverted-ground utilities. */
export function usesInverseToken(source: string): boolean {
  return /\binverse-(?:bg|ink)\b/.test(source);
}
