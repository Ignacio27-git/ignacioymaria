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
});
