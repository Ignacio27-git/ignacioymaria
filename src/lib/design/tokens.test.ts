// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";

import { WATCH_STATES } from "@/domain/watch-state";

import { contrastRatio } from "./contrast";
import {
  CONTRAST_PAIRS,
  STATE_SWATCHES,
  THEMES,
  TOKENS,
  usesInverseToken,
} from "./tokens";

describe("TOKENS", () => {
  test("light ground and ink are paper #f4f4f1 and ink #131313", () => {
    expect(TOKENS.light.paper).toBe("#f4f4f1");
    expect(TOKENS.light.ink).toBe("#131313");
  });

  test("dark ground and ink are #111214 and #ebe9e4", () => {
    expect(TOKENS.dark.paper).toBe("#111214");
    expect(TOKENS.dark.ink).toBe("#ebe9e4");
  });

  test("never uses pure white or pure black as ground or ink", () => {
    for (const theme of THEMES) {
      for (const key of ["paper", "ink"] as const) {
        expect(TOKENS[theme][key].toLowerCase()).not.toBe("#ffffff");
        expect(TOKENS[theme][key].toLowerCase()).not.toBe("#000000");
      }
    }
  });

  test("the focus ring and the inverted box reuse ink and paper", () => {
    for (const theme of THEMES) {
      expect(TOKENS[theme].focus).toBe(TOKENS[theme].ink);
      expect(TOKENS[theme].inverseBg).toBe(TOKENS[theme].ink);
      expect(TOKENS[theme].inverseInk).toBe(TOKENS[theme].paper);
    }
  });

  test("every value is a #rrggbb hex in both themes", () => {
    for (const theme of THEMES) {
      const values = Object.values(TOKENS[theme]);
      expect(values.length).toBeGreaterThan(10);
      for (const value of values) expect(value).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("STATE_SWATCHES", () => {
  test("has an entry for every watch state", () => {
    expect(Object.keys(STATE_SWATCHES).sort()).toEqual(
      [...WATCH_STATES].sort(),
    );
  });

  test("pending is an outline in rule-strong; the other five are filled", () => {
    expect(STATE_SWATCHES.pending).toEqual({
      kind: "outline",
      token: "ruleStrong",
    });
    const filled = WATCH_STATES.filter(
      (state) => STATE_SWATCHES[state].kind === "fill",
    );
    expect(filled).toHaveLength(5);
  });

  test("the filled swatches use distinct tokens that exist in both themes", () => {
    const tokens = WATCH_STATES.map((state) => STATE_SWATCHES[state].token);
    expect(new Set(tokens).size).toBe(6);
    for (const theme of THEMES) {
      for (const token of tokens) {
        expect(TOKENS[theme][token]).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });
});

describe("CONTRAST_PAIRS (WCAG AA)", () => {
  test("lists text, large-text and swatch pairs", () => {
    const kinds = new Set(CONTRAST_PAIRS.map((pair) => pair.kind));
    expect([...kinds].sort()).toEqual(["large-text", "non-text", "text"]);
  });

  test("covers every watch state swatch against the ground", () => {
    for (const state of WATCH_STATES) {
      const token = STATE_SWATCHES[state].token;
      expect(
        CONTRAST_PAIRS.some(
          (pair) =>
            pair.kind === "non-text" && pair.fg === token && pair.bg === "paper",
        ),
        `swatch pair for ${state}`,
      ).toBe(true);
    }
  });

  for (const theme of THEMES) {
    test(`every pair meets its minimum ratio in ${theme}`, () => {
      expect(CONTRAST_PAIRS.length).toBeGreaterThan(10);
      for (const pair of CONTRAST_PAIRS) {
        const ratio = contrastRatio(
          TOKENS[theme][pair.fg],
          TOKENS[theme][pair.bg],
        );
        expect(
          ratio,
          `${theme}: ${pair.id} (${pair.fg} on ${pair.bg}) is ${ratio.toFixed(2)}, needs ${pair.min}`,
        ).toBeGreaterThanOrEqual(pair.min);
      }
    });
  }

  test("a failing pair would name itself (guard against a silent suite)", () => {
    const weak = contrastRatio("#858480", "#8a8a85");
    expect(weak).toBeLessThan(1.1);
    expect(() =>
      expect(weak, "light: sample (a on b)").toBeGreaterThanOrEqual(3),
    ).toThrow("light: sample (a on b)");
  });
});

describe("usesInverseToken", () => {
  test("detects utility classes built on the inverse tokens", () => {
    expect(usesInverseToken('className="bg-inverse-bg text-inverse-ink"')).toBe(
      true,
    );
    expect(usesInverseToken('className="bg-paper text-ink"')).toBe(false);
  });
});

describe("inverted ground", () => {
  const SRC = join(process.cwd(), "src");
  const ALLOWED = ["components", "ui", "average-box.tsx"].join(sep);

  function listSources(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return listSources(path);
      return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
        ? [path]
        : [];
    });
  }

  test("only average-box.tsx uses inverse- classes (R4)", () => {
    const sources = listSources(SRC);
    expect(sources.length).toBeGreaterThan(20);

    const offenders = sources
      .filter((file) => usesInverseToken(readFileSync(file, "utf8")))
      .map((file) => relative(SRC, file))
      .filter((file) => file !== ALLOWED);

    expect(offenders).toEqual([]);
  });
});
