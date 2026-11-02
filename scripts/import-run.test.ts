// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { fakeTmdbFetch, movieResult, rawRow } from "../tests/import/fakes";
import { runImport, type DbClient, type RunDeps } from "./import-run";

type Call = { sql: string; params: unknown[] | undefined };

/** In-memory stand-in for pg: records every statement, inserts always succeed. */
function fakeDb() {
  const calls: Call[] = [];
  const client: DbClient = {
    connect: async () => undefined,
    end: async () => undefined,
    query: async (sql, params) => {
      calls.push({ sql, params });
      return { rows: [], rowCount: /insert into/i.test(sql) ? 1 : 0 };
    },
  };
  return { calls, client };
}

function makeDeps(overrides: Partial<RunDeps> = {}) {
  const db = fakeDb();
  const reports: string[] = [];
  const logs: string[] = [];
  const errors: string[] = [];
  const createClient = vi.fn(() => db.client);
  const deps: RunDeps = {
    env: { TMDB_READ_ACCESS_TOKEN: "fake-token", IMPORT_DB_URL: "postgresql://u:p@127.0.0.1:1/db" },
    fileExists: () => true,
    readRows: async () => ({ rows: [], themedFills: 0 }),
    fetch: fakeTmdbFetch({}),
    createClient,
    writeReport: async (_path, text) => {
      reports.push(text);
    },
    log: (message) => logs.push(message),
    error: (message) => errors.push(message),
    now: () => new Date("2026-11-02T10:00:00Z"),
    ...overrides,
  };
  return { deps, db, reports, logs, errors, createClient };
}

const inserts = (calls: Call[]) => calls.filter((c) => /insert into/i.test(c.sql));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

// Spec, CLI: "Missing --file exits non-zero without touching the database".
test("missing --file exits 1 and never reaches the database", async () => {
  const { deps, errors, createClient } = makeDeps();
  const readRows = vi.fn(deps.readRows);
  const code = await runImport([], { ...deps, readRows });
  expect(code).toBe(1);
  expect(errors.join("\n")).toContain("--file");
  expect(createClient).not.toHaveBeenCalled();
  expect(readRows).not.toHaveBeenCalled();
});

test("--dry-run alone is still a missing --file; no database either", async () => {
  const { deps, createClient } = makeDeps();
  expect(await runImport(["--dry-run"], deps)).toBe(1);
  expect(createClient).not.toHaveBeenCalled();
});

test("a file that does not exist exits 1 without a database connection", async () => {
  const { deps, errors, createClient } = makeDeps({ fileExists: () => false });
  expect(await runImport(["--file", "nope.xlsx"], deps)).toBe(1);
  expect(errors.join("\n")).toContain("file not found");
  expect(createClient).not.toHaveBeenCalled();
});

// Spec, TMDB: "A TMDB error on one row does not abort the run".
test("a TMDB error on one row leaves it unlinked, reports it and keeps going", async () => {
  const { deps, db, reports } = makeDeps({
    readRows: async () => ({
      rows: [rawRow(2, "Broken Lookup"), rawRow(3, "Good Film")],
      themedFills: 0,
    }),
    fetch: fakeTmdbFetch({
      "Broken Lookup": 500,
      "Good Film": [movieResult(4242, "Good Film")],
    }),
  });

  const code = await runImport(["--file", "x.xlsx"], deps);

  expect(code).toBe(0);
  const rows = inserts(db.calls).map((c) => ({ name: c.params?.[0], tmdbId: c.params?.[10] }));
  expect(rows).toEqual([
    { name: "Broken Lookup", tmdbId: null },
    { name: "Good Film", tmdbId: 4242 },
  ]);
  expect(db.calls.some((c) => c.sql === "commit")).toBe(true);
  expect(reports).toHaveLength(1);
  expect(reports[0]).toContain("Broken Lookup");
  expect(reports[0]).toContain("TMDB lookup failed, left unlinked");
});
