/**
 * Testable core of the Excel importer. Everything that touches the outside
 * world (workbook, network, database, file system, environment) is injected
 * through `RunDeps`, so tests can drive a whole run with synthetic rows, a fake
 * TMDB `fetch` and either a fake or the LOCAL Postgres. The CLI in
 * `import-excel.ts` only supplies the real dependencies.
 */
import { join } from "node:path";
import { parseArgs } from "node:util";

import type { Title } from "../src/domain/title";
import { describeDbError } from "../src/import/db-error";
import { hostOf, resolveImportEnv } from "../src/import/env";
import { decideMatch, type MatchDecision } from "../src/import/match";
import { resolveCollisions } from "../src/import/merge";
import { renderReport } from "../src/import/report";
import { buildImportRow, prepareRow, type PreparedRow } from "../src/import/row";
import { mapSearchMulti } from "../src/import/tmdb-search";
import type { MatchKind, RawRow, ReportNote } from "../src/import/types";
import { mapDetails } from "../src/server/tmdb/mappers";
import type { TmdbDetails } from "../src/server/tmdb/types";

export const SHEET = "Pelis";
const REPORT_DIR = "import-reports";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_TIMEOUT_MS = 5000;
const TMDB_RETRY_CAP_MS = 1000;

export class UsageError extends Error {}

/** The slice of `pg.Client` the importer uses. */
export type DbClient = {
  connect(): Promise<unknown>;
  query(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: Array<Record<string, unknown>>; rowCount: number | null }>;
  end(): Promise<unknown>;
};

export type RunDeps = {
  env: Readonly<Record<string, string | undefined>>;
  fileExists(path: string): boolean;
  readRows(file: string): Promise<{ rows: RawRow[]; themedFills: number }>;
  fetch: typeof fetch;
  createClient(connectionString: string): DbClient;
  writeReport(path: string, text: string): Promise<void>;
  log(message: string): void;
  error(message: string): void;
  now(): Date;
};

// ---------------------------------------------------------------- arguments

export function parseCli(argv: string[]): { file: string; dryRun: boolean } {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: { file: { type: "string" }, "dry-run": { type: "boolean" } },
      strict: true,
    }));
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : "invalid arguments");
  }
  if (!values.file) throw new UsageError("--file <path to the xlsx> is required");
  return { file: values.file, dryRun: values["dry-run"] === true };
}

// --------------------------------------------------------------------- TMDB

export function createTmdb(token: string, fetchImpl: typeof fetch) {
  const cache = new Map<string, unknown>();

  /** Resolves to the JSON body or null. Logs a short code only, never URL or token. */
  async function request(path: string, params: Record<string, string>): Promise<unknown> {
    const url = `${TMDB_BASE}${path}?${new URLSearchParams({ language: "es-ES", ...params })}`;
    if (cache.has(url)) return cache.get(url) ?? null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      let response: Response;
      try {
        response = await fetchImpl(url, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          signal: AbortSignal.timeout(TMDB_TIMEOUT_MS),
        });
      } catch {
        console.error("tmdb request failed: network");
        return null;
      }
      if (response.status === 429 && attempt === 1) {
        const seconds = Number(response.headers.get("retry-after"));
        const wait = Number.isFinite(seconds) ? Math.min(seconds * 1000, TMDB_RETRY_CAP_MS) : TMDB_RETRY_CAP_MS;
        await new Promise((resolve) => setTimeout(resolve, wait));
        continue;
      }
      if (!response.ok) {
        console.error(`tmdb request failed: status ${response.status}`);
        return null;
      }
      try {
        const body: unknown = await response.json();
        cache.set(url, body);
        return body;
      } catch {
        console.error("tmdb request failed: bad json");
        return null;
      }
    }
    return null;
  }

  return {
    async search(query: string) {
      const body = await request("/search/multi", {
        query,
        include_adult: "false",
        page: "1",
      });
      return body === null ? null : mapSearchMulti(body);
    },
    async details(kind: MatchKind, id: number): Promise<TmdbDetails | null> {
      const body = await request(`/${kind === "movie" ? "movie" : "tv"}/${id}`, {
        append_to_response: "credits",
      });
      return body === null ? null : mapDetails(kind, body);
    },
  };
}

function lookupFailed(prepared: PreparedRow): MatchDecision {
  const kind: MatchKind = prepared.markerKind ?? "movie";
  const notes: MatchDecision["notes"] = [
    { reason: "unlinked", original: prepared.displayName, decision: "TMDB lookup failed, left unlinked" },
  ];
  if (prepared.markerKind === null) {
    notes.push({ reason: "kind", original: prepared.displayName, decision: "movie by default" });
  }
  return { candidate: null, kind, notes };
}

// ----------------------------------------------------------------- database

export async function existingKeys(client: DbClient, keys: string[]): Promise<Set<string>> {
  const result = await client.query(
    "select import_key from public.titles where import_key = any($1::text[])",
    [keys],
  );
  return new Set(result.rows.map((row) => String(row.import_key)));
}

export const INSERT_SQL = `
  insert into public.titles
    (name, kind, year, actors, observations, watch_date, state,
     score_maria, score_ignacio, seasons_watched, tmdb_id, poster_path,
     seasons_total, import_key)
  values ($1, $2, $3, $4::text[], $5, $6::date, $7, $8, $9, $10, $11, $12, $13, $14)
  on conflict do nothing
  returning id`;

function insertParams(key: string, title: Title): unknown[] {
  const series = title.kind === "series";
  return [
    title.name,
    title.kind,
    title.year,
    [...title.actors],
    title.observations,
    title.watchDate.kind === "known" ? title.watchDate.date : null,
    title.state,
    title.scores.maria,
    title.scores.ignacio,
    series ? title.seasonsWatched : null,
    title.tmdbId,
    title.posterPath,
    series ? title.seasonsTotal : null,
    key,
  ];
}

export type Built = { key: string; title: Title; row: number; name: string };

export async function writeAll(
  client: DbClient,
  built: Built[],
): Promise<{ inserted: number; existing: number; conflicts: ReportNote[] }> {
  await client.query("begin");
  try {
    const already = await existingKeys(client, built.map((b) => b.key));
    let inserted = 0;
    let existing = 0;
    const conflicts: ReportNote[] = [];
    for (const item of built) {
      if (already.has(item.key)) {
        existing += 1;
        continue;
      }
      const result = await client.query(INSERT_SQL, insertParams(item.key, item.title));
      if (result.rowCount === 1) {
        inserted += 1;
      } else {
        conflicts.push({
          row: item.row,
          name: item.name,
          reason: "conflict",
          original: item.title.tmdbId === null ? item.key : `TMDB id ${item.title.tmdbId} (${item.title.kind})`,
          decision: "not inserted: another title already has this TMDB id",
        });
      }
    }
    await client.query("commit");
    return { inserted, existing, conflicts };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  }
}

// --------------------------------------------------------------------- main

/** Runs the whole import. Resolves to the process exit code (never throws). */
export async function runImport(argv: string[], deps: RunDeps): Promise<number> {
  const secrets: string[] = [];
  /** Last line of defense: no known secret survives in any printed text. */
  const redact = (text: string) =>
    secrets.reduce((out, secret) => out.split(secret).join("[redacted]"), text);
  const log = (message: string) => deps.log(redact(message));
  let exitCode = 0;

  try {
    const { file, dryRun } = parseCli(argv);
    if (!deps.fileExists(file)) throw new UsageError(`file not found: ${file}`);

    const env = resolveImportEnv(deps.env, dryRun);
    if (!env.ok) throw new UsageError(env.error);
    const { token, dbUrl } = env;
    secrets.push(...env.secrets);

    const { rows: raw, themedFills } = await deps.readRows(file);
    log(`Read ${raw.length} named rows from "${SHEET}"${dryRun ? " (dry run)" : ""}.`);
    if (themedFills > 0) {
      log(`Warning: ${themedFills} name cells use a theme fill color, treated as no fill (pending).`);
    }

    const { kept, notes: collisions } = resolveCollisions(raw.map(prepareRow));
    const tmdb = createTmdb(token, deps.fetch);
    const notes: ReportNote[] = [...collisions];
    const built: Built[] = [];
    let linked = 0;

    for (const [index, prepared] of kept.entries()) {
      const candidates = await tmdb.search(prepared.name);
      const decision =
        candidates === null
          ? lookupFailed(prepared)
          : decideMatch(
              {
                name: prepared.name,
                year: prepared.year,
                markerKind: prepared.markerKind,
                seriesHint: prepared.seriesHint,
              },
              candidates,
            );
      const details = decision.candidate
        ? await tmdb.details(decision.candidate.kind, decision.candidate.tmdbId)
        : null;

      const result = buildImportRow(
        prepared,
        decision,
        details && {
          posterPath: details.posterPath,
          actors: details.actors,
          seasonsTotal: details.kind === "series" ? details.seasonsTotal : null,
        },
      );
      notes.push(...result.notes);
      if (result.ok) {
        if (result.title.tmdbId !== null) linked += 1;
        built.push({ key: result.key, title: result.title, row: prepared.row, name: prepared.displayName });
      } else {
        notes.push({
          row: prepared.row,
          name: prepared.displayName,
          reason: "invalid",
          original: prepared.displayName,
          decision: `not imported: invalid fields ${result.errors.map((e) => e.field).join(", ")}`,
        });
      }
      if ((index + 1) % 25 === 0) log(`Processed ${index + 1}/${kept.length} distinct titles.`);
    }

    let outcome = "";
    let keysCheckSkipped: string | null = null;
    if (dbUrl === null) {
      keysCheckSkipped = "IMPORT_DB_URL is not set";
      outcome = `Dry run without IMPORT_DB_URL: ${built.length} titles ready, database not consulted.`;
    } else if (dryRun) {
      // Read-only lookup. Any failure still ends in a full report (never a write).
      log(`Connecting to ${hostOf(dbUrl)}.`);
      const client = deps.createClient(dbUrl);
      try {
        await client.connect();
        await client.query("begin read only");
        const present = await existingKeys(client, built.map((b) => b.key));
        await client.query("rollback");
        outcome = `Dry run: ${built.length - present.size} would be inserted, ${present.size} already imported.`;
      } catch (error) {
        keysCheckSkipped = describeDbError(error);
        outcome = `Dry run: existing-keys check skipped (${keysCheckSkipped}), database not consulted.`;
        exitCode = 1;
      } finally {
        await client.end().catch(() => undefined);
      }
    } else {
      log(`Connecting to ${hostOf(dbUrl)}.`);
      const client = deps.createClient(dbUrl);
      try {
        await client.connect();
        const result = await writeAll(client, built);
        notes.push(...result.conflicts);
        outcome = `Inserted ${result.inserted}, already existing ${result.existing}, TMDB conflicts ${result.conflicts.length}.`;
      } finally {
        await client.end().catch(() => undefined);
      }
    }

    const stamp = deps.now().toISOString().replace(/[:.]/g, "-");
    const reportPath = join(REPORT_DIR, `pelis-${stamp}${dryRun ? "-dry-run" : ""}.md`);
    notes.sort((a, b) => a.row - b.row);
    await deps.writeReport(
      reportPath,
      renderReport({
        generatedAt: deps.now().toISOString(),
        dryRun,
        totalRows: raw.length,
        notes,
        keysCheckSkipped,
      }),
    );

    const duplicates = collisions.filter((n) => n.reason === "duplicate").length;
    const merged = collisions.filter((n) => n.reason === "season_merge").length;
    log(
      `Distinct titles: ${kept.length}, duplicates skipped: ${duplicates}, merged season rows: ${merged}, linked to TMDB: ${linked}.`,
    );
    if (keysCheckSkipped !== null) log(`Existing-keys check skipped: ${keysCheckSkipped}.`);
    log(outcome);
    log(`Report: ${reportPath} (${notes.length} entries).`);
    if (dryRun) log("Dry run: nothing written to the database.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    deps.error(redact(`import failed: ${message}`));
    return 1;
  }
  return exitCode;
}
