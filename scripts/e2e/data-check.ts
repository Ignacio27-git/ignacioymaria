/**
 * CI proof that an E2E run gives the local data back (S6.1). `seed` writes a
 * row and records a fingerprint of both tables; `expect-failure` checks that
 * the failing run failed for the intended reason; `compare` checks the data is
 * unchanged and no snapshot schema is left. Seeding is refused outside CI so a
 * developer's real rows can never be mistaken for the fixture.
 *
 *   tsx scripts/e2e/data-check.ts seed|compare [--file <path>]
 *   tsx scripts/e2e/data-check.ts expect-failure <report.json>
 */
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openLocalDb } from "./local-db-guard";
import { SNAPSHOT_SCHEMA, type Queryable } from "./local-data";

/** The one test of `playwright.failing.config.ts`; the report check looks for it by name. */
export const FAILING_TEST_TITLE = "deliberate failure after clearing the titles table";

const FINGERPRINT_SQL = `select
  md5(coalesce((select string_agg(t::text, '|' order by t.id) from public.titles t), '')) || ':' ||
  md5(coalesce((select string_agg(s::text, '|' order by s.title_id, s.season_number) from public.title_seasons s), '')) as fp`;

const SCHEMA_SQL = `select exists (select 1 from pg_namespace where nspname = '${SNAPSHOT_SCHEMA}') as present`;

/** Hash of every column of both tables, in a stable order. */
export async function fingerprint(q: Queryable): Promise<string> {
  const { rows } = await q.query(FINGERPRINT_SQL);
  return String(rows[0].fp);
}

/** Writes a series with a season and a fixed creation time: only in CI. */
export async function seedPreservedRows(
  q: Queryable,
  env: Record<string, string | undefined>,
): Promise<void> {
  if (!env.CI) {
    throw new Error("Refusing to seed: CI is not set. This fixture is for the CI database only.");
  }
  const { rows } = await q.query(
    `insert into public.titles (name, kind, state, watch_date, score_ignacio, score_maria, created_at)
     values ('CI preserved series', 'series', 'watched', '2020-05-06', 7, 8, '2020-01-02T03:04:05Z')
     returning id`,
  );
  await q.query(
    `insert into public.title_seasons (title_id, season_number, state, watch_date, score_ignacio, score_maria)
     values ($1, 1, 'watched', '2020-05-06', 7, 8)`,
    [rows[0].id],
  );
}

/** Throws unless the data matches `expected` and the snapshot schema is gone. */
export async function compareFingerprint(q: Queryable, expected: string): Promise<void> {
  const { rows } = await q.query(SCHEMA_SQL);
  if (rows[0].present === true) {
    throw new Error(`The ${SNAPSHOT_SCHEMA} snapshot schema is still present after the run.`);
  }
  const actual = await fingerprint(q);
  if (actual !== expected) {
    throw new Error(`The local data differ after the run (expected ${expected}, found ${actual}).`);
  }
}

interface ReportSpec {
  title?: string;
  ok?: boolean;
}
interface ReportSuite {
  specs?: ReportSpec[];
  suites?: ReportSuite[];
}

function failedSpecs(suites: ReportSuite[] | undefined): ReportSpec[] {
  return (suites ?? []).flatMap((suite) => [
    ...(suite.specs ?? []).filter((spec) => spec.ok === false),
    ...failedSpecs(suite.suites),
  ]);
}

/**
 * Throws unless a Playwright JSON report holds exactly one test, the deliberate
 * one, and it failed. A non-zero exit alone would also come from a load error.
 */
export function assertOneExpectedFailure(report: unknown): void {
  const data = report as {
    stats?: { expected?: number; unexpected?: number; flaky?: number; skipped?: number };
    errors?: unknown[];
    suites?: ReportSuite[];
  };
  if ((data.errors ?? []).length > 0) {
    throw new Error("The failing run reported a global error, not only the deliberate failure.");
  }
  const stats = data.stats ?? {};
  if (stats.unexpected !== 1 || stats.expected !== 0 || stats.flaky !== 0 || stats.skipped !== 0) {
    throw new Error(`Expected exactly one failed test and nothing else, got ${JSON.stringify(stats)}.`);
  }
  const failed = failedSpecs(data.suites);
  if (failed.length !== 1 || failed[0].title !== FAILING_TEST_TITLE) {
    throw new Error("The failed test is not the deliberate one.");
  }
}

// --------------------------------------------------------------------- main

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const fileFlag = rest.indexOf("--file");
  const file =
    fileFlag >= 0
      ? rest[fileFlag + 1]
      : join(process.env.RUNNER_TEMP ?? tmpdir(), "e2e-data-fingerprint.txt");

  if (command === "expect-failure") {
    assertOneExpectedFailure(JSON.parse(await readFile(rest[0], "utf8")));
    console.log("The failing run failed exactly once, on the deliberate test.");
    return 0;
  }

  const url = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  const client = await openLocalDb(url);
  try {
    if (command === "seed") {
      await seedPreservedRows(client, process.env);
      const value = await fingerprint(client);
      await writeFile(file, value, "utf8");
      console.log(`Seeded the fixture; fingerprint ${value}`);
      return 0;
    }
    if (command === "compare") {
      await compareFingerprint(client, (await readFile(file, "utf8")).trim());
      console.log("The local data are unchanged and no snapshot is left.");
      return 0;
    }
    console.error("Usage: data-check.ts seed|compare [--file <path>] | expect-failure <report.json>");
    return 2;
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.split("\\").join("/").endsWith("scripts/e2e/data-check.ts")) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error: Error) => {
      console.error(error.message);
      process.exit(1);
    },
  );
}
