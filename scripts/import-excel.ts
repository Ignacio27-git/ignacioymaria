/**
 * Local one-off importer: sheet `Pelis` of the Excel workbook into `titles`.
 *
 *   pnpm import:excel --file "<path to xlsx>" [--dry-run]
 *
 * Insert-only and idempotent (import_key + `on conflict do nothing`). Reads
 * TMDB_READ_ACCESS_TOKEN and SUPABASE_DB_URL from .env.local itself (recorded
 * exception to D-42). Neither value is ever logged, printed or reported.
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";

import ExcelJS from "exceljs";
import { Client } from "pg";

import type { Title } from "../src/domain/title";
import { decideMatch, type MatchDecision } from "../src/import/match";
import { renderReport } from "../src/import/report";
import { buildImportRow, dedupeRows, prepareRow, type PreparedRow } from "../src/import/row";
import { mapSearchMulti } from "../src/import/tmdb-search";
import type { MatchKind, RawRow, ReportNote } from "../src/import/types";
import { mapDetails } from "../src/server/tmdb/mappers";
import type { TmdbDetails } from "../src/server/tmdb/types";

const SHEET = "Pelis";
const REPORT_DIR = "import-reports";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_TIMEOUT_MS = 5000;
const TMDB_RETRY_CAP_MS = 1000;

class UsageError extends Error {}

const secrets: string[] = [];

/** Last line of defense: no known secret survives in any printed text. */
function redact(text: string): string {
  return secrets.reduce((out, secret) => out.split(secret).join("[redacted]"), text);
}

function log(message: string): void {
  console.log(redact(message));
}

// ---------------------------------------------------------------- arguments

function parseCli(argv: string[]): { file: string; dryRun: boolean } {
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

// ------------------------------------------------------------------ workbook

function plain(value: unknown): string | number | Date | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (value instanceof Date) return value;
  if (typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (Array.isArray(object.richText)) {
      return (object.richText as Array<{ text?: string }>)
        .map((part) => part.text ?? "")
        .join("");
    }
    if (typeof object.error === "string") return object.error;
    if ("result" in object) return plain(object.result);
    if (typeof object.text === "string") return object.text;
  }
  return null;
}

const asText = (value: string | number | Date | null): string | null =>
  value === null ? null : value instanceof Date ? value.toISOString() : String(value);

function fillOf(cell: ExcelJS.Cell): { argb: string | null; themed: boolean } {
  const fill = cell.fill;
  if (!fill || fill.type !== "pattern" || fill.pattern === "none") {
    return { argb: null, themed: false };
  }
  const color = fill.fgColor;
  if (color?.argb) return { argb: color.argb, themed: false };
  return { argb: null, themed: color?.theme !== undefined };
}

async function readRows(file: string): Promise<{ rows: RawRow[]; themedFills: number }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const sheet = workbook.getWorksheet(SHEET);
  if (!sheet) throw new UsageError(`sheet "${SHEET}" not found in the workbook`);

  const rows: RawRow[] = [];
  let themedFills = 0;
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const name = plain(row.getCell(1).value);
    if (name === null || name instanceof Date || String(name).trim() === "") return;

    const fill = fillOf(row.getCell(1));
    if (fill.themed) themedFills += 1;
    const date = plain(row.getCell(5).value);
    const year = plain(row.getCell(6).value);
    rows.push({
      row: rowNumber,
      name,
      fillArgb: fill.argb,
      scoreMaria: plain(row.getCell(2).value),
      scoreIgnacio: plain(row.getCell(3).value),
      watchDate: date,
      watchDateFormat: row.getCell(5).numFmt ?? null,
      year: year instanceof Date ? asText(year) : year,
      actors: asText(plain(row.getCell(7).value)) ?? "",
      observations: asText(plain(row.getCell(8).value)),
    });
  });
  return { rows, themedFills };
}

// --------------------------------------------------------------------- TMDB

function createTmdb(token: string) {
  const cache = new Map<string, unknown>();

  /** Resolves to the JSON body or null. Logs a short code only, never URL or token. */
  async function request(path: string, params: Record<string, string>): Promise<unknown> {
    const url = `${TMDB_BASE}${path}?${new URLSearchParams({ language: "es-ES", ...params })}`;
    if (cache.has(url)) return cache.get(url) ?? null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      let response: Response;
      try {
        response = await fetch(url, {
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

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "(unparseable URL)";
  }
}

async function existingKeys(client: Client, keys: string[]): Promise<Set<string>> {
  const result = await client.query<{ import_key: string }>(
    "select import_key from public.titles where import_key = any($1::text[])",
    [keys],
  );
  return new Set(result.rows.map((row) => row.import_key));
}

const INSERT_SQL = `
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

type Built = { key: string; title: Title; row: number; name: string };

async function writeAll(
  client: Client,
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

async function main(): Promise<void> {
  const { file, dryRun } = parseCli(process.argv.slice(2));
  if (!existsSync(file)) throw new UsageError(`file not found: ${file}`);

  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!token) throw new UsageError("TMDB_READ_ACCESS_TOKEN is missing (set it in .env.local)");
  if (!dryRun && !dbUrl) throw new UsageError("SUPABASE_DB_URL is missing (set it in .env.local)");
  secrets.push(token);
  if (dbUrl) secrets.push(dbUrl);

  const { rows: raw, themedFills } = await readRows(file);
  log(`Read ${raw.length} named rows from "${SHEET}"${dryRun ? " (dry run)" : ""}.`);
  if (themedFills > 0) {
    log(`Warning: ${themedFills} name cells use a theme fill color, treated as no fill (pending).`);
  }

  const { kept, duplicates } = dedupeRows(raw.map(prepareRow));
  const tmdb = createTmdb(token);
  const notes: ReportNote[] = [...duplicates];
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
  if (dbUrl) {
    log(`Connecting to ${hostOf(dbUrl)}.`);
    const client = new Client({ connectionString: dbUrl });
    try {
      await client.connect();
      if (dryRun) {
        await client.query("begin read only");
        const present = await existingKeys(client, built.map((b) => b.key));
        await client.query("rollback");
        outcome = `Dry run: ${built.length - present.size} would be inserted, ${present.size} already imported.`;
      } else {
        const result = await writeAll(client, built);
        notes.push(...result.conflicts);
        outcome = `Inserted ${result.inserted}, already existing ${result.existing}, TMDB conflicts ${result.conflicts.length}.`;
      }
    } finally {
      await client.end().catch(() => undefined);
    }
  } else {
    outcome = `Dry run without SUPABASE_DB_URL: ${built.length} titles ready, database not consulted.`;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = join(REPORT_DIR, `pelis-${stamp}${dryRun ? "-dry-run" : ""}.md`);
  await mkdir(REPORT_DIR, { recursive: true });
  notes.sort((a, b) => a.row - b.row);
  await writeFile(
    reportPath,
    renderReport({ generatedAt: new Date().toISOString(), dryRun, totalRows: raw.length, notes }),
    "utf8",
  );

  log(`Distinct titles: ${kept.length}, duplicates skipped: ${duplicates.length}, linked to TMDB: ${linked}.`);
  log(outcome);
  log(`Report: ${reportPath} (${notes.length} entries).`);
  if (dryRun) log("Dry run: nothing written to the database.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(redact(`import failed: ${message}`));
  process.exit(1);
});
