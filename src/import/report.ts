import type { NoteReason, ReportNote } from "./types";

export type ReportInput = {
  generatedAt: string;
  dryRun: boolean;
  totalRows: number;
  notes: readonly ReportNote[];
  /** Why the existing-keys lookup did not run (never a secret); null/absent when it ran. */
  keysCheckSkipped?: string | null;
};

const SECTIONS: ReadonlyArray<readonly [NoteReason, string]> = [
  ["off_legend", "Off-legend fill colors"],
  ["score", "Adjusted or invalid scores"],
  ["date", "Dates that are not a full date"],
  ["season", "Season markers to review"],
  ["duplicate", "Duplicates (not imported)"],
  ["season_merge", "Merged season rows (interim, not imported separately)"],
  ["unlinked", "Titles left unlinked from TMDB"],
  ["conflict", "TMDB conflicts (not imported)"],
  ["kind", "Kind decisions that are not certain"],
  ["invalid", "Rows that could not be imported"],
];

/** One table cell: no pipes or line breaks that would break the Markdown table. */
function cell(value: string | number): string {
  return String(value).replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}

/**
 * Markdown report of everything the people should review. It holds personal
 * data (titles, notes), so it lives in a gitignored folder. Never put secrets
 * here.
 */
export function renderReport(input: ReportInput): string {
  const lines: string[] = [
    `# Excel import report${input.dryRun ? " (dry run)" : ""}`,
    "",
    `- Generated: ${input.generatedAt}`,
    `- Mode: ${input.dryRun ? "dry run, nothing was written to the database" : "real run"}`,
    `- Named rows read from Pelis: ${input.totalRows}`,
    `- Entries to review: ${input.notes.length}`,
    ...(input.keysCheckSkipped
      ? [`- Existing-keys check skipped: ${input.keysCheckSkipped}`]
      : []),
    "",
  ];

  if (input.notes.length === 0) {
    lines.push("Nothing to review.", "");
    return lines.join("\n");
  }

  for (const [reason, heading] of SECTIONS) {
    const entries = input.notes.filter((n) => n.reason === reason);
    if (entries.length === 0) continue;
    lines.push(
      `## ${heading} (${entries.length})`,
      "",
      "| Row | Name | Reason | Original | Decision |",
      "|---|---|---|---|---|",
      ...entries.map(
        (n) =>
          `| ${cell(n.row)} | ${cell(n.name)} | ${cell(n.reason)} | ${cell(n.original)} | ${cell(n.decision)} |`,
      ),
      "",
    );
  }
  return lines.join("\n");
}
