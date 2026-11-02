// @vitest-environment node
import { describe, expect, test } from "vitest";

import { renderReport } from "./report";
import type { NoteReason, ReportNote } from "./types";

const REASONS: NoteReason[] = [
  "off_legend",
  "score",
  "date",
  "season",
  "duplicate",
  "season_merge",
  "unlinked",
  "conflict",
  "kind",
  "invalid",
];

const note = (reason: NoteReason, row: number): ReportNote => ({
  row,
  name: `Name ${row}`,
  reason,
  original: `orig ${reason}`,
  decision: `decision ${reason}`,
});

describe("renderReport", () => {
  test("every entry carries row, name, reason, original and decision", () => {
    const md = renderReport({
      generatedAt: "2026-11-01T10:00:00.000Z",
      dryRun: false,
      totalRows: 3,
      notes: [note("score", 12)],
    });
    expect(md).toContain("12");
    expect(md).toContain("Name 12");
    expect(md).toContain("orig score");
    expect(md).toContain("decision score");
    expect(md).toMatch(/score/i);
  });

  test("lists every category, each under its own heading", () => {
    const md = renderReport({
      generatedAt: "2026-11-01T10:00:00.000Z",
      dryRun: false,
      totalRows: 8,
      notes: REASONS.map((reason, i) => note(reason, i + 2)),
    });
    for (const reason of REASONS) expect(md).toContain(`orig ${reason}`);
    expect(md.match(/^## /gm)?.length).toBeGreaterThanOrEqual(REASONS.length);
  });

  test("states a dry run and an empty report", () => {
    const md = renderReport({
      generatedAt: "2026-11-01T10:00:00.000Z",
      dryRun: true,
      totalRows: 0,
      notes: [],
    });
    expect(md).toMatch(/dry run/i);
    expect(md).toMatch(/nothing to review/i);
  });

  test("escapes table separators and line breaks in values", () => {
    const md = renderReport({
      generatedAt: "2026-11-01T10:00:00.000Z",
      dryRun: false,
      totalRows: 1,
      notes: [{ ...note("date", 3), original: "a|b\nc" }],
    });
    expect(md).toContain("a\\|b c");
  });

  test("merged season rows get their own section, apart from duplicates", () => {
    const md = renderReport({
      generatedAt: "2026-11-01T10:00:00.000Z",
      dryRun: false,
      totalRows: 2,
      notes: [note("season_merge", 10), note("duplicate", 11)],
    });
    expect(md).toContain("## Merged season rows (interim, not imported separately) (1)");
    expect(md).toContain("## Duplicates (not imported) (1)");
  });

  test("states why the existing-keys check was skipped, only when it was", () => {
    const base = {
      generatedAt: "2026-11-01T10:00:00.000Z",
      dryRun: true,
      totalRows: 1,
      notes: [note("date", 3)],
    };
    const skipped = renderReport({
      ...base,
      keysCheckSkipped: "IMPORT_DB_URL is not set",
    });
    expect(skipped).toContain("- Existing-keys check skipped: IMPORT_DB_URL is not set");
    expect(renderReport({ ...base, keysCheckSkipped: null })).not.toMatch(/check skipped/i);
    expect(
      renderReport({ ...base, notes: [], keysCheckSkipped: "authentication failed" }),
    ).toContain("- Existing-keys check skipped: authentication failed");
  });
});
