// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  CLEAR_TITLES_SQL,
  MARKER_ROWS_SQL,
  SEED_SEASON_SQL,
  SEED_TITLE_SQL,
  SNAPSHOT_GATE,
  SNAPSHOT_SCHEMA,
  STATE_SQL,
  atomically,
  readSnapshotState,
  requireLiveSnapshot,
  restoreSnapshot,
  takeSnapshot,
  type Queryable,
} from "./local-data";

type Row = Record<string, unknown>;
type Reply = { rows?: Row[]; rowCount?: number } | Error | undefined;

/** A scripted client: `handler` answers by statement text; every statement is recorded. */
function fakeDb(handler: (text: string, values: unknown[] | undefined) => Reply) {
  const statements: string[] = [];
  const db: Queryable & { statements: string[] } = {
    statements,
    async query(sql, values) {
      const text = typeof sql === "string" ? sql : sql.text;
      statements.push(text);
      const reply = handler(text, values ?? (typeof sql === "string" ? undefined : sql.values));
      if (reply instanceof Error) throw reply;
      return { rows: reply?.rows ?? [], rowCount: reply?.rowCount ?? reply?.rows?.length ?? 0 };
    },
  };
  return db;
}

const PUBLIC_TITLE_COLUMNS = ["id", "name", "kind", "created_at", "updated_at", "import_key"];
const SEASON_COLUMNS = ["title_id", "season_number", "state"];

const present = { has_schema: true, has_marker: true, has_titles: true, has_seasons: true };
const NO_SCHEMA = { has_schema: false, has_marker: false, has_titles: false, has_seasons: false };

interface World {
  state: Row;
  markerRows: number;
  publicTitleColumns: string[];
  snapshotTitleColumns: string[];
  counts: { publicTitles: number; publicSeasons: number; snapTitles: number; snapSeasons: number };
  marker: { titles_count: number; seasons_count: number };
  /** Row counts of the public tables once the inserts ran. */
  afterRestore?: { titles: number; seasons: number };
}

function world(overrides: Partial<World> = {}): World {
  return {
    state: present,
    markerRows: 1,
    publicTitleColumns: PUBLIC_TITLE_COLUMNS,
    snapshotTitleColumns: PUBLIC_TITLE_COLUMNS,
    counts: { publicTitles: 3, publicSeasons: 2, snapTitles: 3, snapSeasons: 2 },
    marker: { titles_count: 3, seasons_count: 2 },
    ...overrides,
  };
}

/** Answers the catalog and count questions the core functions ask, from `w`. */
function answer(w: World) {
  let inserted = false;
  return (text: string, values: unknown[] | undefined): Reply => {
    if (text === STATE_SQL) return { rows: [w.state] };
    if (text === MARKER_ROWS_SQL) return { rows: [{ n: w.markerRows }] };
    if (text.includes("information_schema.columns")) {
      const [schema, table] = values as [string, string];
      const names =
        table === "title_seasons"
          ? SEASON_COLUMNS
          : schema === SNAPSHOT_SCHEMA
            ? w.snapshotTitleColumns
            : w.publicTitleColumns;
      return { rows: names.map((column_name) => ({ column_name })) };
    }
    if (/^insert into public\./.test(text.trim())) inserted = true;
    if (text.includes("titles_count") && text.includes("select") && !text.includes("create table")) {
      return { rows: [w.marker] };
    }
    if (/select count\(\*\)/.test(text)) {
      const { counts, afterRestore } = w;
      if (text.includes(`${SNAPSHOT_SCHEMA}.title_seasons`)) return { rows: [{ n: counts.snapSeasons }] };
      if (text.includes(`${SNAPSHOT_SCHEMA}.titles`)) return { rows: [{ n: counts.snapTitles }] };
      if (text.includes("public.title_seasons")) {
        return { rows: [{ n: inserted && afterRestore ? afterRestore.seasons : counts.publicSeasons }] };
      }
      if (text.includes("public.titles")) {
        return { rows: [{ n: inserted && afterRestore ? afterRestore.titles : counts.publicTitles }] };
      }
    }
    return undefined;
  };
}

const destructive = /^\s*(delete|drop|create|insert|truncate|alter)\b/i;
const writes = (db: { statements: string[] }) => db.statements.filter((s) => destructive.test(s));

describe("readSnapshotState", () => {
  it.each([
    ["absent without the schema", NO_SCHEMA, 0, "absent"],
    ["incomplete with a schema but no marker", { ...present, has_marker: false }, 0, "incomplete"],
    ["incomplete without the seasons copy", { ...present, has_seasons: false }, 1, "incomplete"],
    ["incomplete with an empty marker", present, 0, "incomplete"],
    ["complete with marker and both copies", present, 1, "complete"],
  ])("is %s", async (_label, state, markerRows, expected) => {
    const db = fakeDb(answer(world({ state, markerRows })));
    expect(await readSnapshotState(db)).toBe(expected);
  });
});

describe("takeSnapshot", () => {
  it("S4.2 aborts on a pending snapshot and leaves it intact", async () => {
    const db = fakeDb(answer(world()));
    await expect(takeSnapshot(db)).rejects.toThrow(/pending|already/i);
    expect(writes(db)).toEqual([]);
  });

  it("S4.3 aborts on an incomplete snapshot before any destructive work", async () => {
    const db = fakeDb(answer(world({ state: { ...present, has_marker: false } })));
    await expect(takeSnapshot(db)).rejects.toThrow(/incomplete/i);
    expect(writes(db)).toEqual([]);
  });

  it("copies both tables with their non-generated columns and writes the marker last", async () => {
    const db = fakeDb(answer(world({ state: NO_SCHEMA, markerRows: 0 })));
    const counts = await takeSnapshot(db);
    expect(counts).toEqual({ titles: 3, seasons: 2 });

    const made = writes(db);
    expect(made[0]).toBe(`create schema ${SNAPSHOT_SCHEMA}`);
    expect(made).toHaveLength(4);
    expect(made[1]).toMatch(
      new RegExp(`create table ${SNAPSHOT_SCHEMA}\\.titles as select .*"import_key".* from public\\.titles`),
    );
    expect(made[2]).toMatch(
      new RegExp(
        `create table ${SNAPSHOT_SCHEMA}\\.title_seasons as select .*"season_number".* from public\\.title_seasons`,
      ),
    );
    expect(made[3]).toMatch(new RegExp(`create table ${SNAPSHOT_SCHEMA}\\.marker as select`));
    expect(made.join("\n")).not.toContain("name_search");
    expect(made.join("\n")).not.toContain("if not exists");
  });
});

describe("restoreSnapshot", () => {
  it("S3.3 with no marker deletes and changes nothing", async () => {
    const db = fakeDb(answer(world({ state: NO_SCHEMA, markerRows: 0 })));
    expect(await restoreSnapshot(db)).toEqual({ restored: false });
    expect(writes(db)).toEqual([]);
  });

  it("S4.3 throws on an incomplete snapshot without touching the tables", async () => {
    const db = fakeDb(answer(world({ state: { ...present, has_titles: false } })));
    await expect(restoreSnapshot(db)).rejects.toThrow(/incomplete/i);
    expect(writes(db)).toEqual([]);
  });

  it("replaces both tables from the copy and drops the schema last", async () => {
    const db = fakeDb(answer(world({ afterRestore: { titles: 3, seasons: 2 } })));
    expect(await restoreSnapshot(db)).toEqual({ restored: true, titles: 3, seasons: 2 });

    const steps = writes(db);
    expect(steps[0]).toMatch(/^delete from public\.title_seasons/);
    expect(steps[1]).toMatch(/^delete from public\.titles/);
    expect(steps[2]).toMatch(
      /^insert into public\.titles \([^)]*"created_at"[^)]*\) select [^)]* from e2e_local_snapshot\.titles/,
    );
    expect(steps[3]).toMatch(
      /^insert into public\.title_seasons \([^)]*"season_number"[^)]*\) select [^)]* from e2e_local_snapshot\.title_seasons/,
    );
    expect(steps[4]).toBe(`drop schema ${SNAPSHOT_SCHEMA} cascade`);
    expect(steps).toHaveLength(5);
    expect(steps.join("\n")).not.toContain("name_search");
  });

  it("S5.3 refuses to restore when the table has columns the copy lacks", async () => {
    const db = fakeDb(answer(world({ publicTitleColumns: [...PUBLIC_TITLE_COLUMNS, "rating_note"] })));
    await expect(restoreSnapshot(db)).rejects.toThrow(/columns/i);
    expect(writes(db)).toEqual([]);
  });

  it("refuses when the copy no longer matches its marker", async () => {
    const db = fakeDb(answer(world({ marker: { titles_count: 4, seasons_count: 2 } })));
    await expect(restoreSnapshot(db)).rejects.toThrow(/marker|count/i);
    expect(writes(db)).toEqual([]);
  });

  it("throws before dropping the copy when the restored counts differ", async () => {
    const db = fakeDb(answer(world({ afterRestore: { titles: 2, seasons: 2 } })));
    await expect(restoreSnapshot(db)).rejects.toThrow(/verif|count/i);
    expect(db.statements.some((s) => s.startsWith("drop schema"))).toBe(false);
  });
});

describe("atomically", () => {
  it("locks both tables under a bounded lock_timeout, runs the work, then commits", async () => {
    const db = fakeDb(() => undefined);
    const result = await atomically(db, async (q) => {
      await q.query("select 1");
      return "ok";
    });
    expect(result).toBe("ok");
    expect(db.statements[0]).toBe("begin");
    expect(db.statements[1]).toBe("set local lock_timeout = '15000ms'");
    expect(db.statements[2]).toBe("lock table public.titles, public.title_seasons in share row exclusive mode");
    expect(db.statements.slice(3)).toEqual(["select 1", "commit"]);
  });

  it("honours a custom lock_timeout", async () => {
    const db = fakeDb(() => undefined);
    await atomically(db, async () => undefined, { lockTimeoutMs: 250 });
    expect(db.statements[1]).toBe("set local lock_timeout = '250ms'");
  });

  it("S5.2 rolls back, never commits, and rethrows when the work fails", async () => {
    const db = fakeDb(() => undefined);
    await expect(
      atomically(db, async () => {
        throw new Error("restore broke");
      }),
    ).rejects.toThrow("restore broke");
    expect(db.statements.at(-1)).toBe("rollback");
    expect(db.statements).not.toContain("commit");
  });

  it("S5.5 aborts on a lock timeout before the work runs", async () => {
    const timeout = Object.assign(new Error("canceling statement due to lock timeout"), { code: "55P03" });
    const db = fakeDb((text) => (text.startsWith("lock table") ? timeout : undefined));
    let ran = false;
    await expect(
      atomically(db, async () => {
        ran = true;
      }),
    ).rejects.toThrow(/lock timeout/);
    expect(ran).toBe(false);
    expect(db.statements.at(-1)).toBe("rollback");
    expect(db.statements).not.toContain("commit");
  });

  it("a failing rollback does not hide the original error", async () => {
    const db = fakeDb((text) => (text === "rollback" ? new Error("connection gone") : undefined));
    await expect(
      atomically(db, async () => {
        throw new Error("original");
      }),
    ).rejects.toThrow("original");
  });
});

describe("requireLiveSnapshot", () => {
  it("passes while the marker exists", async () => {
    const db = fakeDb(() => ({ rows: [{ live: true }] }));
    await expect(requireLiveSnapshot(db)).resolves.toBeUndefined();
  });

  it("throws when the marker is gone", async () => {
    const db = fakeDb(() => ({ rows: [{ live: false }] }));
    await expect(requireLiveSnapshot(db)).rejects.toThrow(/snapshot/i);
  });

  it("S5.7 throws when the schema is gone (42P01)", async () => {
    const missing = Object.assign(new Error('relation "e2e_local_snapshot.marker" does not exist'), {
      code: "42P01",
    });
    const db = fakeDb(() => missing);
    await expect(requireLiveSnapshot(db)).rejects.toThrow(/snapshot/i);
  });
});

describe("gated statements (S5.7)", () => {
  it("the gate reads the marker", () => {
    expect(SNAPSHOT_GATE).toBe(`exists (select 1 from ${SNAPSHOT_SCHEMA}.marker)`);
  });

  it.each([
    ["clear", CLEAR_TITLES_SQL],
    ["seed title", SEED_TITLE_SQL],
    ["seed season", SEED_SEASON_SQL],
  ])("%s carries the gate inside its own statement", (_label, sql) => {
    expect(sql).toContain(SNAPSHOT_GATE);
    expect(sql).not.toContain(";");
  });

  it("seeds never insert the generated column", () => {
    expect(SEED_TITLE_SQL).not.toContain("name_search");
  });
});
