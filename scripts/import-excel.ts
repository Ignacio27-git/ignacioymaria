/**
 * Local one-off importer: sheet `Pelis` of the Excel workbook into `titles`.
 *
 *   pnpm import:excel --file "<path to xlsx>" [--dry-run]
 *
 * Insert-only and idempotent (import_key + `on conflict do nothing`). Reads
 * TMDB_READ_ACCESS_TOKEN and IMPORT_DB_URL from .env.local itself (recorded
 * exception to D-42; SUPABASE_DB_URL is never read). Neither value is ever
 * logged, printed or reported. The logic lives in `import-run.ts` (tested);
 * this file only supplies the real workbook, network, database and file system.
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import ExcelJS from "exceljs";
import { Client } from "pg";

import type { RawRow } from "../src/import/types";
import { SHEET, UsageError, runImport } from "./import-run";

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

// --------------------------------------------------------------------- main

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

runImport(process.argv.slice(2), {
  env: process.env,
  fileExists: existsSync,
  readRows,
  fetch,
  createClient: (connectionString) => new Client({ connectionString }),
  writeReport: async (path, text) => {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, text, "utf8");
  },
  log: (message) => console.log(message),
  error: (message) => console.error(message),
  now: () => new Date(),
}).then((code) => {
  process.exit(code);
});
