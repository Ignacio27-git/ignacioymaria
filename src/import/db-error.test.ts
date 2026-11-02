// @vitest-environment node
import { describe, expect, test } from "vitest";

import { describeDbError } from "./db-error";

describe("describeDbError", () => {
  test.each([
    ["ECONNREFUSED", "connection failed (ECONNREFUSED)"],
    ["ENOTFOUND", "connection failed (ENOTFOUND)"],
    ["ETIMEDOUT", "connection failed (ETIMEDOUT)"],
    ["28P01", "authentication failed"],
    ["28000", "authentication failed"],
    ["42P01", "titles table missing"],
    ["42703", "import_key column missing"],
  ])("code %s -> %s", (code, expected) => {
    expect(describeDbError({ code })).toBe(expected);
  });

  test("any other code is named, an absent code is unknown", () => {
    expect(describeDbError({ code: "57P03" })).toBe("database error (57P03)");
    expect(describeDbError(new Error("boom"))).toBe("database error (unknown)");
    expect(describeDbError("just text")).toBe("database error (unknown)");
    expect(describeDbError(null)).toBe("database error (unknown)");
  });

  test("the message is never used: a user or password inside it cannot leak", () => {
    const error = Object.assign(
      new Error('password authentication failed for user "postgres.abc" (pw hunter2)'),
      { code: "28P01" },
    );
    const text = describeDbError(error);
    expect(text).toBe("authentication failed");
    expect(text).not.toMatch(/postgres\.abc|hunter2/);
    const unknown = describeDbError(new Error("connect to user:hunter2@host failed"));
    expect(unknown).not.toMatch(/hunter2|user/);
  });

  test("a non-string code is ignored", () => {
    expect(describeDbError({ code: 42 })).toBe("database error (unknown)");
  });
});
