// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { Queryable } from "./local-data";
import { rollbackOnly } from "./rollback-only";

/** A fake client that records what reaches it. */
function fakeClient() {
  const seen: unknown[] = [];
  const client: Queryable = {
    async query(sql, values) {
      seen.push(values === undefined ? sql : [sql, values]);
      return { rows: [{ ok: true }], rowCount: 1 };
    },
  };
  return { client, seen };
}

const FORBIDDEN = [
  "commit",
  "COMMIT",
  "end",
  "abort",
  "rollback",
  "rollback to savepoint x",
  "begin",
  "begin read write",
  "start transaction",
  "prepare transaction 'x'",
  "commit prepared 'x'",
  "savepoint x",
  "release savepoint x",
  "set default_transaction_read_only = off",
  "reset all",
];

describe("rollbackOnly (S8.3)", () => {
  it.each(FORBIDDEN)("rejects %s before it reaches the client", async (sql) => {
    const { client, seen } = fakeClient();
    await expect(rollbackOnly(client).query(sql)).rejects.toThrow(/not allowed/);
    expect(seen).toEqual([]);
  });

  it.each(FORBIDDEN)("rejects the {text} form of %s", async (text) => {
    const { client, seen } = fakeClient();
    await expect(rollbackOnly(client).query({ text })).rejects.toThrow(/not allowed/);
    expect(seen).toEqual([]);
  });

  it.each([
    "/* hello */ commit",
    "-- hello\ncommit",
    "/* a /* nested */ still a comment */ end",
    "  \n\t -- one\n /* two */ -- three\n rollback",
    "/**/begin",
  ])("strips comments and whitespace before reading the keyword: %j", async (sql) => {
    const { client, seen } = fakeClient();
    await expect(rollbackOnly(client).query(sql)).rejects.toThrow(/not allowed/);
    expect(seen).toEqual([]);
  });

  it("does not mistake words that merely contain a forbidden keyword", async () => {
    const { client, seen } = fakeClient();
    const wrapped = rollbackOnly(client);
    await wrapped.query("select 1 as the_end");
    await wrapped.query("with x as (select 1) select * from x where 'begin' = 'end'");
    await wrapped.query("select case when true then 1 else 2 end");
    await wrapped.query("endpoint_lookup");
    expect(seen).toHaveLength(4);
  });

  it.each([
    "select 1; commit",
    "select 1;",
    "delete from public.titles; commit",
    // Hiding the second statement behind a quoted comment marker.
    "select '--'; commit",
    "select 1 /* ; */",
    "select 1 -- ;",
  ])("rejects any semicolon: %j", async (sql) => {
    const { client, seen } = fakeClient();
    await expect(rollbackOnly(client).query(sql)).rejects.toThrow(/not allowed/);
    expect(seen).toEqual([]);
  });

  it("forwards allowed statements, values and results untouched", async () => {
    const { client, seen } = fakeClient();
    const wrapped = rollbackOnly(client);
    const result = await wrapped.query("delete from public.titles where id = $1", ["a"]);
    await wrapped.query({ text: "create schema e2e_local_snapshot" });
    expect(result).toEqual({ rows: [{ ok: true }], rowCount: 1 });
    expect(seen).toEqual([
      ["delete from public.titles where id = $1", ["a"]],
      { text: "create schema e2e_local_snapshot" },
    ]);
  });

  it("rejects anything that is not a string or a {text} config", async () => {
    const { client, seen } = fakeClient();
    await expect(rollbackOnly(client).query(42 as never)).rejects.toThrow(/not allowed/);
    expect(seen).toEqual([]);
  });
});
