const CONNECTION_CODES = new Set(["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT"]);
const AUTH_CODES = new Set(["28P01", "28000"]);

/**
 * Secret-free reason for a failed database step. Maps the error `code` only:
 * the driver message can contain the user, the host or even the password, so
 * it is never used.
 */
export function describeDbError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code: unknown }).code
      : undefined;
  if (typeof code !== "string") return "database error (unknown)";
  if (CONNECTION_CODES.has(code)) return `connection failed (${code})`;
  if (AUTH_CODES.has(code)) return "authentication failed";
  if (code === "42P01") return "titles table missing";
  if (code === "42703") return "import_key column missing";
  return `database error (${code})`;
}
