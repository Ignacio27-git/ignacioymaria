// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import {
  cssVarName,
  THEMES,
  TOKENS,
  type Theme,
  type TokenName,
} from "./tokens";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** Inner text of the first `{ ... }` block that follows `opener`. */
function blockAfter(source: string, opener: string): string {
  const start = source.indexOf(opener);
  expect(start, `block "${opener}" is missing from globals.css`).toBeGreaterThan(
    -1,
  );
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(open + 1, i);
  }
  throw new Error(`Unbalanced braces after "${opener}"`);
}

function declarations(block: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of block.matchAll(/(--[a-z-]+)\s*:\s*([^;{}]+);/g)) {
    found.set(match[1], match[2].trim());
  }
  return found;
}

const expectedVars = (theme: Theme) =>
  new Map(
    (Object.keys(TOKENS[theme]) as TokenName[]).map((token) => [
      `--${cssVarName(token)}`,
      TOKENS[theme][token],
    ]),
  );

const BLOCKS: ReadonlyArray<{
  label: string;
  theme: Theme;
  read: () => string;
}> = [
  { label: ":root", theme: "light", read: () => blockAfter(css, ":root {") },
  {
    label: '[data-theme="dark"]',
    theme: "dark",
    read: () => blockAfter(css, '[data-theme="dark"] {'),
  },
  {
    label: "prefers-color-scheme: dark",
    theme: "dark",
    read: () =>
      blockAfter(
        blockAfter(css, "@media (prefers-color-scheme: dark) {"),
        ':root:not([data-theme="light"])',
      ),
  },
];

describe("globals.css mirrors the TS tokens", () => {
  test("cssVarName kebab-cases a token name", () => {
    expect(cssVarName("inkMuted")).toBe("ink-muted");
    expect(cssVarName("stateNoRewatch")).toBe("state-no-rewatch");
    expect(cssVarName("paper")).toBe("paper");
  });

  for (const { label, theme, read } of BLOCKS) {
    test(`${label} declares every ${theme} token with the TS value`, () => {
      const block = read();
      const actual = declarations(block);
      const expected = expectedVars(theme);

      expect(expected.size).toBe(14);
      for (const [name, value] of expected) {
        expect(actual.get(name), `${label} ${name}`).toBe(value);
      }
      expect([...actual.keys()].sort()).toEqual([...expected.keys()].sort());
    });

    test(`${label} sets color-scheme: ${theme}`, () => {
      expect(read()).toContain(`color-scheme: ${theme};`);
    });
  }

  test("covers both themes", () => {
    expect(new Set(BLOCKS.map((block) => block.theme))).toEqual(
      new Set(THEMES),
    );
  });
});

describe("globals.css theme wiring", () => {
  test("@theme inline maps a --color-* utility to every token variable", () => {
    const theme = declarations(blockAfter(css, "@theme inline {"));

    for (const token of Object.keys(TOKENS.light) as TokenName[]) {
      const name = cssVarName(token);
      expect(theme.get(`--color-${name}`), `--color-${name}`).toBe(
        `var(--${name})`,
      );
    }
  });

  test("exposes the table container and the Archivo font family", () => {
    const theme = declarations(blockAfter(css, "@theme inline {"));

    expect(theme.get("--container-table")).toBe("47.5rem");
    expect(theme.get("--font-sans")).toContain("var(--font-archivo)");
  });

  test("font-condensed narrows through font-stretch 75% (spike 1.5)", () => {
    const utility = blockAfter(css, "@utility font-condensed");

    expect(utility).toMatch(/font-stretch:\s*75%\s*;/);
    expect(utility).not.toContain("font-variation-settings");
  });

  test("the dark variant follows both the attribute and the media query", () => {
    const variant = blockAfter(css, "@custom-variant dark");

    expect(variant).toContain('[data-theme="dark"]');
    expect(variant).toContain("prefers-color-scheme: dark");
    expect(variant).toContain('[data-theme="light"]');
  });

  test("the native search clear button is painted with the ink token", () => {
    const rule = blockAfter(
      css,
      'input[type="search"]::-webkit-search-cancel-button',
    );

    expect(rule).toMatch(/background-color:\s*var\(--ink\)/);
    expect(rule).toContain("mask:");
    expect(rule).toMatch(/appearance:\s*none/);
  });

  test("focus ring and no Geist reference", () => {
    expect(css).toMatch(/:focus-visible/);
    expect(css).toContain("var(--focus)");
    expect(css.toLowerCase()).not.toContain("geist");
  });
});
