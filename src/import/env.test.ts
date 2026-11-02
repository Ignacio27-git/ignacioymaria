// @vitest-environment node
import { describe, expect, test } from "vitest";

import { hostOf, resolveImportEnv } from "./env";

const URL_WITH_SECRET = "postgresql://postgres.abc:s3cr%40t!@db.example.co:6543/postgres";

describe("resolveImportEnv", () => {
  test("a real run needs the token and IMPORT_DB_URL", () => {
    const result = resolveImportEnv(
      { TMDB_READ_ACCESS_TOKEN: "tok-123", IMPORT_DB_URL: URL_WITH_SECRET },
      false,
    );
    expect(result).toMatchObject({ ok: true, token: "tok-123", dbUrl: URL_WITH_SECRET });
  });

  test("a real run without IMPORT_DB_URL is an error naming it, even with SUPABASE_DB_URL", () => {
    const result = resolveImportEnv(
      { TMDB_READ_ACCESS_TOKEN: "tok", SUPABASE_DB_URL: "postgresql://u:p@127.0.0.1:54322/postgres" },
      false,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("IMPORT_DB_URL");
    expect(result.error).not.toContain("127.0.0.1");
  });

  test("a dry run without IMPORT_DB_URL has no database and never falls back to SUPABASE_DB_URL", () => {
    const result = resolveImportEnv(
      { TMDB_READ_ACCESS_TOKEN: "tok", SUPABASE_DB_URL: "postgresql://u:p@127.0.0.1:54322/postgres" },
      true,
    );
    expect(result).toMatchObject({ ok: true, dbUrl: null });
    if (!result.ok) return;
    expect(result.secrets).toEqual(["tok"]);
  });

  test("an empty IMPORT_DB_URL counts as not set", () => {
    expect(resolveImportEnv({ TMDB_READ_ACCESS_TOKEN: "tok", IMPORT_DB_URL: "" }, true)).toMatchObject({
      ok: true,
      dbUrl: null,
    });
    expect(resolveImportEnv({ TMDB_READ_ACCESS_TOKEN: "tok", IMPORT_DB_URL: "" }, false).ok).toBe(false);
  });

  test("a missing token is an error in both modes", () => {
    for (const dryRun of [true, false]) {
      const result = resolveImportEnv({ IMPORT_DB_URL: URL_WITH_SECRET }, dryRun);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("TMDB_READ_ACCESS_TOKEN");
    }
  });

  test("secrets cover the token, the whole URL and the password, decoded and as written", () => {
    const result = resolveImportEnv(
      { TMDB_READ_ACCESS_TOKEN: "tok-123", IMPORT_DB_URL: URL_WITH_SECRET },
      false,
    );
    expect(result.ok && result.secrets).toEqual(
      expect.arrayContaining(["tok-123", URL_WITH_SECRET, "s3cr@t!", "s3cr%40t!"]),
    );
  });

  test("a URL without password adds no empty secret", () => {
    const result = resolveImportEnv(
      { TMDB_READ_ACCESS_TOKEN: "tok", IMPORT_DB_URL: "postgresql://db.example.co/postgres" },
      false,
    );
    expect(result.ok && result.secrets).toEqual(["tok", "postgresql://db.example.co/postgres"]);
  });
});

describe("hostOf", () => {
  test("keeps only the host (and port), never user or password", () => {
    expect(hostOf(URL_WITH_SECRET)).toBe("db.example.co:6543");
  });

  test("an unparseable value is not echoed", () => {
    expect(hostOf("not a url with secret")).toBe("(unparseable URL)");
  });
});
