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

const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter(
  (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
);

test("import modules exist", () => {
  expect(files.length).toBeGreaterThan(0);
});

test("import modules only use relative imports", () => {
  const offenders = files.flatMap((file) =>
    extractSpecifiers(readFileSync(join(dir, file), "utf8"))
      .filter((s) => !isRelative(s))
      .map((s) => `${file}: ${s}`),
  );
  expect(offenders).toEqual([]);
});

test("import modules never reach server code or server-only", () => {
  const offenders = files.flatMap((file) =>
    extractSpecifiers(readFileSync(join(dir, file), "utf8"))
      .filter((s) => /server/.test(s))
      .map((s) => `${file}: ${s}`),
  );
  expect(offenders).toEqual([]);
});
