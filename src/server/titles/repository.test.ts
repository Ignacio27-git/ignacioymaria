// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createClient } from "@/lib/supabase/server";

import { TITLE_COLUMNS, type TitleInsert, type TitleRow } from "./row";
import {
  createTitlesRepository,
  getTitlesRepository,
  tmdbKey,
} from "./repository";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

type Reply = {
  data?: unknown;
  error?: { code?: string; message?: string } | null;
};
type Call = [method: string, ...args: unknown[]];

/**
 * Minimal PostgREST builder stub: every chain method records the call and
 * returns the builder; awaiting it or `single()` resolves the next queued reply.
 */
function stubClient(...replies: Reply[]) {
  const queue = [...replies];
  const queries: { table: string; calls: Call[] }[] = [];
  const client = {
    from(table: string) {
      const calls: Call[] = [];
      queries.push({ table, calls });
      const next = () => {
        const reply = queue.shift() ?? { data: null, error: null };
        return Promise.resolve({
          data: reply.data ?? null,
          error: reply.error ?? null,
        });
      };
      const builder: Record<string, unknown> = {
        then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
          next().then(resolve, reject),
      };
      for (const method of [
        "select",
        "insert",
        "update",
        "delete",
        "eq",
        "in",
        "ilike",
        "order",
      ]) {
        builder[method] = (...args: unknown[]) => {
          calls.push([method, ...args]);
          return builder;
        };
      }
      for (const method of ["single", "maybeSingle"]) {
        builder[method] = () => {
          calls.push([method]);
          return next();
        };
      }
      return builder;
    },
  };
  return { client: client as never, queries };
}

const row: TitleRow = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Amélie",
  kind: "movie",
  year: 2001,
  actors: [],
  observations: null,
  watch_date: null,
  state: "watched",
  score_maria: "7.25",
  score_ignacio: null,
  seasons_watched: null,
  seasons_total: null,
  tmdb_id: 194,
  poster_path: null,
  created_at: "2026-10-30T10:00:00+00:00",
};

const insertRow: TitleInsert = {
  name: "Amélie",
  kind: "movie",
  year: 2001,
  actors: [],
  observations: null,
  watch_date: null,
  state: "pending",
  score_maria: null,
  score_ignacio: null,
  seasons_watched: null,
  seasons_total: null,
  tmdb_id: 194,
  poster_path: null,
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("insert", () => {
  test("inserts the row, selects the explicit column list and maps the record", async () => {
    const { client, queries } = stubClient({ data: row });

    const result = await createTitlesRepository(client).insert(insertRow);

    expect(queries[0]).toEqual({
      table: "titles",
      calls: [["insert", insertRow], ["select", TITLE_COLUMNS], ["single"]],
    });
    expect(result.ok && result.value.id).toBe(row.id);
    expect(result.ok && result.value.title.scores.maria).toBe(7.25);
  });

  test("23505 resolves the existing id of the (kind, tmdb_id) pair", async () => {
    const { client, queries } = stubClient(
      { error: { code: "23505" } },
      { data: { id: "existing-id" } },
    );

    const result = await createTitlesRepository(client).insert(insertRow);

    expect(result).toEqual({
      ok: false,
      error: { kind: "duplicate", existingId: "existing-id" },
    });
    expect(queries[1]?.calls).toEqual([
      ["select", "id"],
      ["eq", "kind", "movie"],
      ["eq", "tmdb_id", 194],
      ["maybeSingle"],
    ]);
  });

  test("23505 keeps existingId null when the lookup fails", async () => {
    const { client } = stubClient(
      { error: { code: "23505" } },
      { error: { code: "XX000" } },
    );

    const result = await createTitlesRepository(client).insert(insertRow);

    expect(result).toEqual({
      ok: false,
      error: { kind: "duplicate", existingId: null },
    });
  });

  test("a manual title (no tmdb_id) never looks up an existing id", async () => {
    const { client, queries } = stubClient({ error: { code: "23505" } });

    await createTitlesRepository(client).insert({ ...insertRow, tmdb_id: null });

    expect(queries).toHaveLength(1);
  });

  test("an invalid stored row is a failure", async () => {
    const { client } = stubClient({ data: { ...row, state: "archived" } });

    expect(await createTitlesRepository(client).insert(insertRow)).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });
});

describe("findById", () => {
  test("selects one row by id", async () => {
    const { client, queries } = stubClient({ data: row });

    const result = await createTitlesRepository(client).findById(row.id);

    expect(queries[0]?.calls).toEqual([
      ["select", TITLE_COLUMNS],
      ["eq", "id", row.id],
      ["single"],
    ]);
    expect(result.ok && result.value.title.name).toBe("Amélie");
  });

  test("PGRST116 is not_found", async () => {
    const { client } = stubClient({ error: { code: "PGRST116" } });

    expect(await createTitlesRepository(client).findById(row.id)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
  });
});

describe("list", () => {
  test("filters by states and the folded, escaped name_search", async () => {
    const { client, queries } = stubClient({ data: [row] });

    const result = await createTitlesRepository(client).list({
      states: ["watched", "watched_awful"],
      q: "  Amél_% ",
    });

    expect(queries[0]?.calls).toEqual([
      ["select", TITLE_COLUMNS],
      ["in", "state", ["watched", "watched_awful"]],
      ["ilike", "name_search", "%amel\\_\\%%"],
      ["order", "created_at", { ascending: false }],
    ]);
    expect(result.ok && result.value).toHaveLength(1);
  });

  test("a blank q adds no name filter", async () => {
    const { client, queries } = stubClient({ data: [] });

    await createTitlesRepository(client).list({ states: ["pending"], q: "   " });

    expect(queries[0]?.calls.map((c) => c[0])).not.toContain("ilike");
  });

  test("returns every row, unpaginated", async () => {
    const rows = Array.from({ length: 300 }, (_, i) => ({
      ...row,
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    }));
    const { client } = stubClient({ data: rows });

    const result = await createTitlesRepository(client).list({
      states: ["watched"],
      q: "",
    });

    expect(result.ok && result.value).toHaveLength(300);
  });

  test("one invalid row fails the whole list", async () => {
    const { client } = stubClient({ data: [row, { ...row, score_maria: 7.3 }] });

    expect(
      await createTitlesRepository(client).list({ states: ["watched"], q: "" }),
    ).toEqual({ ok: false, error: { kind: "unavailable" } });
  });

  test("a query error is mapped", async () => {
    const { client } = stubClient({ error: { code: "XX000" } });

    expect(
      await createTitlesRepository(client).list({ states: ["watched"], q: "" }),
    ).toEqual({ ok: false, error: { kind: "unavailable" } });
  });
});

describe("update", () => {
  test("writes exactly the given columns", async () => {
    const { client, queries } = stubClient({ data: row });

    const result = await createTitlesRepository(client).update(row.id, {
      score_maria: 8.5,
    });

    expect(queries[0]?.calls).toEqual([
      ["update", { score_maria: 8.5 }],
      ["eq", "id", row.id],
      ["select", TITLE_COLUMNS],
      ["single"],
    ]);
    expect(result.ok).toBe(true);
  });

  test.each([
    ["42501", "forbidden"],
    ["PGRST116", "not_found"],
  ])("%s maps to %s", async (code, kind) => {
    const { client } = stubClient({ error: { code } });

    expect(
      await createTitlesRepository(client).update(row.id, { state: "pending" }),
    ).toEqual({ ok: false, error: { kind } });
  });
});

describe("remove", () => {
  test("deletes by id and returns the removed state", async () => {
    const { client, queries } = stubClient({ data: [{ state: "pending" }] });

    const result = await createTitlesRepository(client).remove(row.id);

    expect(queries[0]?.calls).toEqual([
      ["delete"],
      ["eq", "id", row.id],
      ["select", "state"],
    ]);
    expect(result).toEqual({ ok: true, value: { state: "pending" } });
  });

  test("zero deleted rows is not_found", async () => {
    const { client } = stubClient({ data: [] });

    expect(await createTitlesRepository(client).remove(row.id)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
  });

  test("an invalid state from the database is a failure", async () => {
    const { client } = stubClient({ data: [{ state: "archived" }] });

    expect(await createTitlesRepository(client).remove(row.id)).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });
});

describe("findIdsByTmdb", () => {
  test("returns ids keyed by kind and tmdb id, matching the exact pair", async () => {
    const { client, queries } = stubClient({
      data: [
        { id: "a", kind: "movie", tmdb_id: 550 },
        { id: "b", kind: "series", tmdb_id: 551 },
      ],
    });

    const result = await createTitlesRepository(client).findIdsByTmdb([
      { kind: "movie", tmdbId: 550 },
      { kind: "movie", tmdbId: 551 },
    ]);

    expect(queries[0]?.calls).toEqual([
      ["select", "id, kind, tmdb_id"],
      ["in", "tmdb_id", [550, 551]],
    ]);
    expect(result.ok && [...result.value]).toEqual([
      [tmdbKey("movie", 550), "a"],
    ]);
  });

  test("no refs runs no query", async () => {
    const { client, queries } = stubClient();

    const result = await createTitlesRepository(client).findIdsByTmdb([]);

    expect(queries).toHaveLength(0);
    expect(result.ok && result.value.size).toBe(0);
  });

  test("an error is mapped", async () => {
    const { client } = stubClient({ error: { code: "XX000" } });

    expect(
      await createTitlesRepository(client).findIdsByTmdb([
        { kind: "movie", tmdbId: 1 },
      ]),
    ).toEqual({ ok: false, error: { kind: "unavailable" } });
  });
});

test("getTitlesRepository binds the session client of the request", async () => {
  const { client, queries } = stubClient({ data: row });
  vi.mocked(createClient).mockResolvedValue(client);

  await (await getTitlesRepository()).findById(row.id);

  expect(queries[0]?.table).toBe("titles");
});
