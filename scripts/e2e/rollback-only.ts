import type { Queryable } from "./local-data";

/**
 * Leading keywords that end, nest or reconfigure the transaction. The
 * integration suite runs inside one BEGIN ... ROLLBACK, so none of these may
 * reach the connection through the functions under test.
 */
const FORBIDDEN_KEYWORDS: ReadonlySet<string> = new Set([
  "commit",
  "end",
  "abort",
  "rollback",
  "begin",
  "start",
  "prepare",
  "savepoint",
  "release",
  "set",
  "reset",
]);

/** The first keyword once leading whitespace and comments (nested `/* *\/` included) are skipped. */
function leadingKeyword(sql: string): string {
  let rest = sql;
  for (;;) {
    rest = rest.trimStart();
    if (rest.startsWith("--")) {
      const newline = rest.indexOf("\n");
      rest = newline === -1 ? "" : rest.slice(newline + 1);
    } else if (rest.startsWith("/*")) {
      let depth = 0;
      let i = 0;
      for (; i < rest.length; i += 1) {
        if (rest.startsWith("/*", i)) {
          depth += 1;
          i += 1;
        } else if (rest.startsWith("*/", i)) {
          depth -= 1;
          i += 1;
          if (depth === 0) break;
        }
      }
      rest = rest.slice(i + 1);
    } else {
      break;
    }
  }
  return /^[a-z_]+/i.exec(rest)?.[0].toLowerCase() ?? "";
}

function assertAllowed(sql: unknown): void {
  const text =
    typeof sql === "string"
      ? sql
      : typeof (sql as { text?: unknown } | null)?.text === "string"
        ? (sql as { text: string }).text
        : undefined;
  if (text === undefined) {
    throw new Error("rollback-only client: statement not allowed (neither a string nor a {text} config).");
  }
  // Checked on the raw text: a quoted comment marker must not hide a second statement.
  if (text.includes(";")) {
    throw new Error("rollback-only client: statement not allowed (it contains a semicolon).");
  }
  const keyword = leadingKeyword(text);
  if (FORBIDDEN_KEYWORDS.has(keyword)) {
    throw new Error(`rollback-only client: statement not allowed (${keyword}).`);
  }
}

/**
 * Wraps a connection that sits inside the harness's transaction so the code
 * under test cannot end it, nest into it or leave it. Only the harness, holding
 * the raw connection, sets up and rolls back.
 */
export function rollbackOnly(raw: Queryable): Queryable {
  return {
    async query(sql, values) {
      assertAllowed(sql);
      return raw.query(sql, values);
    },
  };
}
