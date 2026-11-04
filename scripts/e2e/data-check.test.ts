import { describe, expect, it } from "vitest";

import {
  FAILING_TEST_TITLE,
  assertOneExpectedFailure,
  compareFingerprint,
  fingerprint,
  seedPreservedRows,
} from "./data-check";

type Call = { sql: string; values?: unknown[] };

function fakeDb(responses: Record<string, Record<string, unknown>[]> = {}) {
  const calls: Call[] = [];
  return {
    calls,
    async query(sql: string | { text: string }, values?: unknown[]) {
      const text = typeof sql === "string" ? sql : sql.text;
      calls.push({ sql: text, values });
      for (const [needle, rows] of Object.entries(responses)) {
        if (text.includes(needle)) return { rows, rowCount: rows.length };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

const report = (overrides: Record<string, unknown> = {}, specs?: unknown[]) => ({
  stats: { expected: 0, unexpected: 1, flaky: 0, skipped: 0 },
  errors: [],
  suites: [
    {
      title: "fails.spec.ts",
      specs: specs ?? [{ title: FAILING_TEST_TITLE, ok: false }],
      suites: [],
    },
  ],
  ...overrides,
});

describe("seedPreservedRows", () => {
  it("refuses to write anything unless CI is set", async () => {
    const db = fakeDb();
    await expect(seedPreservedRows(db, {})).rejects.toThrow(/CI/);
    await expect(seedPreservedRows(db, { CI: "" })).rejects.toThrow(/CI/);
    expect(db.calls).toEqual([]);
  });

  it("inserts a series with a season when CI is set", async () => {
    const db = fakeDb({ "insert into public.titles": [{ id: "00000000-0000-4000-8000-000000000001" }] });
    await seedPreservedRows(db, { CI: "true" });
    const sqls = db.calls.map((call) => call.sql);
    expect(sqls.some((sql) => sql.includes("insert into public.titles"))).toBe(true);
    expect(sqls.some((sql) => sql.includes("insert into public.title_seasons"))).toBe(true);
  });
});

describe("fingerprint", () => {
  it("returns the hash pair of both tables", async () => {
    const db = fakeDb({ md5: [{ fp: "aaa:bbb" }] });
    await expect(fingerprint(db)).resolves.toBe("aaa:bbb");
  });
});

describe("compareFingerprint", () => {
  it("passes when the hash matches and no snapshot schema remains", async () => {
    const db = fakeDb({ md5: [{ fp: "aaa:bbb" }], pg_namespace: [{ present: false }] });
    await expect(compareFingerprint(db, "aaa:bbb")).resolves.toBeUndefined();
  });

  it("fails when the hash differs", async () => {
    const db = fakeDb({ md5: [{ fp: "aaa:ccc" }], pg_namespace: [{ present: false }] });
    await expect(compareFingerprint(db, "aaa:bbb")).rejects.toThrow(/differ/i);
  });

  it("fails when the snapshot schema remains", async () => {
    const db = fakeDb({ md5: [{ fp: "aaa:bbb" }], pg_namespace: [{ present: true }] });
    await expect(compareFingerprint(db, "aaa:bbb")).rejects.toThrow(/snapshot/i);
  });
});

describe("assertOneExpectedFailure", () => {
  it("accepts exactly the one deliberate failure", () => {
    expect(() => assertOneExpectedFailure(report())).not.toThrow();
  });

  it("rejects a run that failed to load (no tests, a global error)", () => {
    expect(() =>
      assertOneExpectedFailure(
        report({ stats: { expected: 0, unexpected: 0, flaky: 0, skipped: 0 }, errors: [{ message: "boom" }] }, []),
      ),
    ).toThrow();
  });

  it("rejects a global error even with one failed test", () => {
    expect(() => assertOneExpectedFailure(report({ errors: [{ message: "boom" }] }))).toThrow(/error/i);
  });

  it("rejects a different failing test", () => {
    expect(() =>
      assertOneExpectedFailure(report({}, [{ title: "something else", ok: false }])),
    ).toThrow(/deliberate/i);
  });

  it("rejects more than one failure", () => {
    expect(() =>
      assertOneExpectedFailure(
        report({ stats: { expected: 0, unexpected: 2, flaky: 0, skipped: 0 } }),
      ),
    ).toThrow(/exactly one/i);
  });

  it("rejects a passing test next to the failure", () => {
    expect(() =>
      assertOneExpectedFailure(
        report({ stats: { expected: 1, unexpected: 1, flaky: 0, skipped: 0 } }),
      ),
    ).toThrow(/exactly one/i);
  });

  it("finds the failure inside nested suites", () => {
    const nested = report();
    (nested.suites[0] as { specs: unknown[]; suites: unknown[] }).specs = [];
    (nested.suites[0] as { suites: unknown[] }).suites = [
      { title: "inner", specs: [{ title: FAILING_TEST_TITLE, ok: false }], suites: [] },
    ];
    expect(() => assertOneExpectedFailure(nested)).not.toThrow();
  });
});
