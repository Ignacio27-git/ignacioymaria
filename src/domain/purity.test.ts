// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const SPECIFIER_PATTERNS = [
  /\b(?:import|export)\b[^;]*?\bfrom\s*(["'])(.*?)\1/g,
  /\bimport\s*(["'])(.*?)\1/g,
  /\bimport\s*\(\s*(["'])(.*?)\1\s*\)/g,
  /\brequire\s*\(\s*(["'])(.*?)\1\s*\)/g,
];

function extractSpecifiers(source: string): string[] {
  return SPECIFIER_PATTERNS.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => match[2]),
  );
}

const isRelative = (specifier: string) =>
  specifier.startsWith("./") || specifier.startsWith("../");

test("extracts specifiers for every import form and both quote styles", () => {
  const source = [
    `import { a } from "./a";`,
    `import b from '../b';`,
    `export * from "./c";`,
    `export { d } from 'zod';`,
    `import "side-effect";`,
    `const e = await import('./e');`,
    `const f = require("fs");`,
  ].join("\n");

  expect(extractSpecifiers(source).sort()).toEqual(
    ["./a", "../b", "./c", "zod", "side-effect", "./e", "fs"].sort(),
  );
});

test("domain modules only import relative paths", () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const files = readdirSync(dir).filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
  );
  expect(files.length).toBeGreaterThan(0);

  const offenders = files.flatMap((file) =>
    extractSpecifiers(readFileSync(join(dir, file), "utf8"))
      .filter((s) => !isRelative(s))
      .map((s) => `${file}: ${s}`),
  );
  expect(offenders).toEqual([]);
});
