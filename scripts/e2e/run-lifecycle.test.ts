// @vitest-environment node
import { describe, expect, it } from "vitest";

import { createLifecycle, type DataOps, type LifecycleClient } from "./run-lifecycle";

type Snapshot = "absent" | "incomplete" | "complete";

const PEOPLE = [
  { email: "a@example.test", person: "ignacio" },
  { email: "b@example.test", person: "maria" },
] as const;

interface Rig {
  events: string[];
  clients: FakeClient[];
  openOptions: unknown[];
  lifecycle: ReturnType<typeof createLifecycle>;
}

interface FakeClient extends LifecycleClient {
  ended: boolean;
  fail(error: Error): void;
}

interface RigOptions {
  /** The snapshot state the data layer reports. */
  state?: Snapshot;
  lockFree?: boolean;
  failOn?: Partial<Record<"restore" | "take" | "allowlist", Error>>;
  /** Makes `atomically` wait for this promise before running its work. */
  gate?: Promise<void>;
  restoreResult?: { restored: false } | { restored: true; titles: number; seasons: number };
}

function rig(options: RigOptions = {}): Rig {
  const events: string[] = [];
  const clients: FakeClient[] = [];
  const openOptions: unknown[] = [];
  const state = options.state ?? "absent";

  const openDb = async (_url: string, opts: unknown): Promise<LifecycleClient> => {
    openOptions.push(opts);
    let listener: ((error: Error) => void) | undefined;
    const client: FakeClient = {
      ended: false,
      async query(sql, values) {
        const text = typeof sql === "string" ? sql : sql.text;
        if (text.includes("pg_try_advisory_lock")) {
          events.push("lock");
          return { rows: [{ locked: options.lockFree ?? true }], rowCount: 1 };
        }
        if (text.includes("pg_advisory_unlock")) {
          events.push("unlock");
          return { rows: [], rowCount: 0 };
        }
        if (text.includes("allowed_emails")) {
          events.push(`allow:${String(values?.[0])}`);
          if (options.failOn?.allowlist) throw options.failOn.allowlist;
        }
        return { rows: [], rowCount: 0 };
      },
      on(_event, l) {
        listener = l;
      },
      async end() {
        client.ended = true;
        events.push("close");
      },
      fail(error) {
        listener?.(error);
      },
    };
    clients.push(client);
    return client;
  };

  const data: DataOps = {
    async atomically(q, work) {
      events.push("tx:begin");
      await options.gate;
      try {
        const result = await work(q);
        events.push("tx:commit");
        return result;
      } catch (error) {
        events.push("tx:rollback");
        throw error;
      }
    },
    async readSnapshotState() {
      events.push(`state:${state}`);
      return state;
    },
    async takeSnapshot() {
      events.push("take");
      if (options.failOn?.take) throw options.failOn.take;
      return { titles: 1, seasons: 0 };
    },
    async restoreSnapshot() {
      events.push("restore");
      if (options.failOn?.restore) throw options.failOn.restore;
      return options.restoreResult ?? { restored: true, titles: 1, seasons: 0 };
    },
  };

  const lifecycle = createLifecycle({
    url: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    allowlist: PEOPLE,
    openDb,
    data,
    log: (message) => events.push(`log:${message}`),
  });
  return { events, clients, openOptions, lifecycle };
}

const names = (events: string[]) => events.filter((e) => !e.startsWith("log:"));
const logs = (events: string[]) => events.filter((e) => e.startsWith("log:"));

describe("begin", () => {
  it("takes the lock, allowlists, then snapshots in one transaction", async () => {
    const { events, lifecycle, openOptions } = rig({ state: "absent" });
    await lifecycle.begin();
    expect(names(events)).toEqual([
      "lock",
      "allow:a@example.test",
      "allow:b@example.test",
      "tx:begin",
      "state:absent",
      "take",
      "tx:commit",
    ]);
    expect(logs(events)).toEqual([]);
    expect(openOptions[0]).toMatchObject({ keepAlive: true });
  });

  it("S4.1 recovers a leftover snapshot first and logs only after the commit", async () => {
    const { events, lifecycle } = rig({ state: "complete" });
    await lifecycle.begin();
    expect(names(events).filter((e) => /^(tx:|state:|restore|take)/.test(e))).toEqual([
      "tx:begin",
      "state:complete",
      "restore",
      "take",
      "tx:commit",
    ]);
    const logIndex = events.findIndex((e) => /^log:.*restored/i.test(e));
    expect(logIndex).toBeGreaterThan(events.indexOf("tx:commit"));
  });

  it("S4.3 aborts on an incomplete snapshot and takes nothing", async () => {
    const { events, lifecycle, clients } = rig({ state: "incomplete" });
    await expect(lifecycle.begin()).rejects.toThrow(/incomplete/i);
    expect(events).not.toContain("take");
    expect(events).not.toContain("restore");
    expect(clients[0].ended).toBe(true);
  });

  it("S4.4 a refused lock stops before any read or write and leaves teardown idle", async () => {
    const { events, lifecycle, clients } = rig({ lockFree: false });
    await expect(lifecycle.begin()).rejects.toThrow(/another.*run/i);
    expect(names(events)).toEqual(["lock", "close"]);
    expect(clients[0].ended).toBe(true);

    const before = [...events];
    await lifecycle.end();
    expect(events).toEqual(before);
  });

  it("the refused-lock message mentions a stale backend", async () => {
    const { lifecycle } = rig({ lockFree: false });
    await expect(lifecycle.begin()).rejects.toThrow(/stale/i);
  });

  it("a failed recovery throws, snapshots nothing newer and releases the connection", async () => {
    const { events, lifecycle, clients } = rig({ state: "complete", failOn: { restore: new Error("columns changed") } });
    await expect(lifecycle.begin()).rejects.toThrow("columns changed");
    expect(events).not.toContain("take");
    expect(events).toContain("tx:rollback");
    expect(clients[0].ended).toBe(true);

    const before = [...events];
    await lifecycle.end();
    expect(events).toEqual(before);
  });

  it("a failing allowlist stops before the snapshot", async () => {
    const { events, lifecycle, clients } = rig({ failOn: { allowlist: new Error("no allowed_emails") } });
    await expect(lifecycle.begin()).rejects.toThrow("no allowed_emails");
    expect(events).not.toContain("take");
    expect(events).not.toContain("tx:begin");
    expect(clients[0].ended).toBe(true);
  });

  it("refuses a second begin before the first run ended", async () => {
    const { lifecycle } = rig();
    await lifecycle.begin();
    await expect(lifecycle.begin()).rejects.toThrow(/already/i);
  });
});

describe("end", () => {
  it("S5.1 restores after a setup that failed once the snapshot was committed", async () => {
    const { events, lifecycle, clients } = rig();
    await lifecycle.begin();
    // Something later in setup throws; Playwright still runs the teardown file.
    await lifecycle.end();
    expect(names(events).slice(-5)).toEqual(["tx:begin", "restore", "tx:commit", "unlock", "close"]);
    expect(clients[0].ended).toBe(true);
    expect(logs(events).at(-1)).toMatch(/restored/i);
  });

  it("S5.2 a failed restore rolls back, throws, and still releases the lock", async () => {
    const { events, lifecycle, clients } = rig({ failOn: { restore: new Error("restore broke") } });
    await lifecycle.begin();
    await expect(lifecycle.end()).rejects.toThrow("restore broke");
    expect(events).toContain("tx:rollback");
    expect(clients[0].ended).toBe(true);
    expect(events.at(-1)).toBe("close");
  });

  it("throws loudly when it owns the run but the snapshot is gone", async () => {
    const { lifecycle } = rig({ restoreResult: { restored: false } });
    await lifecycle.begin();
    await expect(lifecycle.end()).rejects.toThrow(/snapshot/i);
  });

  it("S5.4 waits for a begin in flight and restores only what that begin committed", async () => {
    let open!: () => void;
    const gate = new Promise<void>((resolve) => {
      open = resolve;
    });
    const { events, lifecycle } = rig({ gate });
    const begun = lifecycle.begin();
    await Promise.resolve();

    const ended = lifecycle.end();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(events).not.toContain("restore");

    open();
    await begun;
    await ended;
    const trace = names(events);
    expect(trace.indexOf("take")).toBeLessThan(trace.indexOf("restore"));
    expect(trace.filter((e) => e === "restore")).toHaveLength(1);
  });

  it("S5.4 when the begin in flight fails, end changes nothing more", async () => {
    let open!: () => void;
    const gate = new Promise<void>((resolve) => {
      open = resolve;
    });
    const { events, lifecycle } = rig({ gate, failOn: { take: new Error("take failed") } });
    const begun = lifecycle.begin();
    const settled = begun.catch(() => undefined);
    const ended = lifecycle.end();
    open();
    await settled;
    await ended;
    expect(events).not.toContain("restore");
  });

  it("S5.6 a lost connection skips the restore, keeps the snapshot and throws", async () => {
    const { events, lifecycle, clients } = rig();
    await lifecycle.begin();
    clients[0].fail(new Error("Connection terminated unexpectedly"));
    expect(logs(events).at(-1)).toMatch(/lost/i);

    await expect(lifecycle.end()).rejects.toThrow(/lost/i);
    expect(events).not.toContain("restore");
    expect(clients).toHaveLength(1);
    expect(clients[0].ended).toBe(true);
  });

  it("does nothing when no begin ever ran", async () => {
    const { events, lifecycle } = rig();
    await lifecycle.end();
    expect(events).toEqual([]);
  });

  it("is reusable: a begin after an end starts a fresh run", async () => {
    const { events, lifecycle, clients } = rig();
    await lifecycle.begin();
    await lifecycle.end();
    await lifecycle.begin();
    await lifecycle.end();
    expect(clients).toHaveLength(2);
    expect(names(events).filter((e) => e === "restore")).toHaveLength(2);
    expect(names(events).filter((e) => e === "take")).toHaveLength(2);
  });
});
