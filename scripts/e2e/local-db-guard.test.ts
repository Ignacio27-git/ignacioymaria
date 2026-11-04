// @vitest-environment node
import { Client } from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";

import { openLocalDb } from "./local-db-guard";

const connectSpy = vi.spyOn(Client.prototype, "connect");

afterEach(() => {
  connectSpy.mockReset();
});

/** Resolves like a real connect but never touches the network. */
function stubConnect() {
  connectSpy.mockImplementation((() => Promise.resolve()) as never);
}

/** A client that fails the test if anything tries to open a connection. */
function failOnConnect() {
  connectSpy.mockImplementation((() => {
    throw new Error("connect was attempted");
  }) as never);
}

const SECRET_USER = "secretuser";
const SECRET_PASSWORD = "s3cr3t-pw";

async function refusal(url: string): Promise<Error> {
  failOnConnect();
  const error = await openLocalDb(url).then(
    () => null,
    (e: unknown) => e as Error,
  );
  expect(error, `expected a refusal for ${url}`).toBeInstanceOf(Error);
  return error as Error;
}

describe("openLocalDb: accepted hosts (S1.1)", () => {
  it.each([
    ["127.0.0.1", "postgresql://postgres:postgres@127.0.0.1:54322/postgres"],
    ["localhost", "postgresql://postgres:postgres@localhost:5432/postgres"],
    ["[::1]", "postgresql://postgres:postgres@[::1]:6543/other"],
  ])("accepts %s on any port and database", async (_label, url) => {
    stubConnect();
    const client = await openLocalDb(url);
    expect(client).toBeInstanceOf(Client);
    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it("connects the very client it checked", async () => {
    stubConnect();
    const client = await openLocalDb("postgresql://u:p@127.0.0.1:1/db");
    expect(connectSpy.mock.contexts[0]).toBe(client);
  });
});

describe("openLocalDb: refusals", () => {
  it.each([
    ["S1.2 hosted host", "postgresql://u:p@db.xyz.supabase.co:5432/postgres"],
    ["S1.3 127.0.0.1 prefix", "postgresql://u:p@127.0.0.1.evil.com/postgres"],
    ["S1.3 localhost suffix", "postgresql://u:p@localhost.evil.com/postgres"],
    ["S1.4 local text in the user", "postgresql://localhost:127.0.0.1@db.xyz.supabase.co/postgres"],
    ["S1.5 malformed", "not a url"],
    ["S1.5 empty string", ""],
    ["S1.5 empty host", "postgresql://u:p@:5432/postgres"],
    ["S1.5 no host at all", "postgresql:///postgres"],
    ["S1.6 host key", "postgresql://u:p@127.0.0.1/postgres?host=db.xyz.supabase.co"],
    ["S1.6 hostaddr key", "postgresql://u:p@localhost/postgres?hostaddr=203.0.113.9"],
    ["S1.9 encoded key", "postgresql://u:p@127.0.0.1/postgres?h%6Fst=evil.com"],
    ["S1.9 upper-case key", "postgresql://u:p@127.0.0.1/postgres?HOST=evil.com"],
    ["S1.9 upper-case hostaddr", "postgresql://u:p@127.0.0.1/postgres?HOSTADDR=203.0.113.9"],
    ["S1.10 comma separated hosts", "postgresql://u:p@127.0.0.1,db.xyz.supabase.co/postgres"],
    ["S1.10 repeated host key", "postgresql://u:p@127.0.0.1/postgres?host=127.0.0.1&host=evil.com"],
    ["S1.10 socket path", "postgresql://u:p@/postgres?host=/var/run/postgresql"],
    ["S1.10 socket in host key", "postgresql://u:p@127.0.0.1/postgres?host=/tmp/.s.PGSQL.5432"],
    ["upper-case hostname", "postgresql://u:p@LOCALHOST/postgres"],
  ])("refuses %s without connecting", async (_label, url) => {
    await refusal(url);
    expect(connectSpy).not.toHaveBeenCalled();
  });

  it.each([
    "postgresql://secretuser:s3cr3t-pw@db.xyz.supabase.co:5432/postgres",
    `postgresql://${SECRET_USER}:${SECRET_PASSWORD}@127.0.0.1/postgres?host=evil.com`,
    `postgresql://${SECRET_USER}:${SECRET_PASSWORD}@/broken path`,
    `postgresql://${SECRET_USER}:${SECRET_PASSWORD}@[bad`,
  ])("S1.7 never leaks credentials or the URL: %s", async (url) => {
    const error = await refusal(url);
    for (const secret of [SECRET_USER, SECRET_PASSWORD, url, "postgresql://"]) {
      expect(error.message).not.toContain(secret);
    }
    expect(error.cause).toBeUndefined();
    expect(JSON.stringify(error, Object.getOwnPropertyNames(error))).not.toContain(SECRET_PASSWORD);
  });
});

describe("openLocalDb: ambient configuration", () => {
  it("does not fall back to PGHOST when the URL has no host", async () => {
    vi.stubEnv("PGHOST", "db.xyz.supabase.co");
    try {
      await refusal("postgresql:///postgres");
      expect(connectSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
