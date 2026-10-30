// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { redirect } from "next/navigation";

import { getCurrentPerson } from "@/server/auth/current-person";
import { searchAddCandidates } from "@/server/titles/add-candidates";
import { addTitle } from "@/server/titles/create";
import { deleteTitle } from "@/server/titles/delete";
import { updateTitleField } from "@/server/titles/update-field";
import { getTmdbDetails } from "@/server/tmdb/lookup";

import {
  addFromTmdbAction,
  addManualAction,
  deleteTitleAction,
  searchAddCandidatesAction,
  updateTitleFieldAction,
} from "./titles";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("@/server/auth/current-person", () => ({ getCurrentPerson: vi.fn() }));
vi.mock("@/server/titles/add-candidates", () => ({ searchAddCandidates: vi.fn() }));
vi.mock("@/server/titles/create", () => ({ addTitle: vi.fn() }));
vi.mock("@/server/titles/delete", () => ({ deleteTitle: vi.fn() }));
vi.mock("@/server/titles/update-field", () => ({ updateTitleField: vi.fn() }));
vi.mock("@/server/tmdb/lookup", () => ({ getTmdbDetails: vi.fn() }));

const ID = "11111111-1111-4111-8111-111111111111";
const view = { id: ID, createdAt: "x", title: { name: "Dune" }, average: null };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-30T12:00:00Z"));
  vi.mocked(getCurrentPerson).mockResolvedValue("maria");
  vi.mocked(addTitle).mockResolvedValue({ ok: true, value: view as never });
  vi.mocked(getTmdbDetails).mockResolvedValue({
    ok: true,
    value: {
      tmdbId: 438631,
      kind: "movie",
      name: "Dune",
      year: 2021,
      posterPath: "/dune.jpg",
      actors: ["Zendaya"],
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

/** The redirect target, or null when the action returned normally. */
async function redirectedTo(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("NEXT_REDIRECT:")) {
      return message.slice("NEXT_REDIRECT:".length);
    }
    throw error;
  }
  return null;
}

describe("passthrough (TC-10)", () => {
  test("updateTitleFieldAction forwards id and patch untouched and returns the result unchanged", async () => {
    const result = { ok: true, value: view } as never;
    vi.mocked(updateTitleField).mockResolvedValue(result);
    const patch = { field: "myScore", value: 8.5 } as const;

    expect(await updateTitleFieldAction(ID, patch)).toBe(result);
    expect(updateTitleField).toHaveBeenCalledWith(ID, patch);
  });

  test("S1: unauthorized results come back as they are (use cases run identity first)", async () => {
    vi.mocked(updateTitleField).mockResolvedValue({
      ok: false,
      error: { kind: "unauthorized" },
    });

    expect(await updateTitleFieldAction(ID, { field: "myScore", value: 1 })).toEqual({
      ok: false,
      error: { kind: "unauthorized" },
    });
  });

  test("searchAddCandidatesAction forwards the query untouched", async () => {
    vi.mocked(searchAddCandidates).mockResolvedValue({ ok: true, value: [] });

    expect(await searchAddCandidatesAction("  dune ")).toEqual({
      ok: true,
      value: [],
    });
    expect(searchAddCandidates).toHaveBeenCalledWith("  dune ");
  });
});

describe("addFromTmdbAction", () => {
  test("re-fetches the details on the server, creates the title and redirects to its ficha", async () => {
    const target = await redirectedTo(() => addFromTmdbAction("movie", 438631));

    expect(getTmdbDetails).toHaveBeenCalledWith("movie", 438631);
    expect(addTitle).toHaveBeenCalledWith({
      name: "Dune",
      kind: "movie",
      year: 2021,
      tmdbId: 438631,
      posterPath: "/dune.jpg",
      actors: ["Zendaya"],
    });
    expect(target).toBe(`/titulo/${ID}`);
  });

  test("a series keeps its seasons total", async () => {
    vi.mocked(getTmdbDetails).mockResolvedValue({
      ok: true,
      value: {
        tmdbId: 70523,
        kind: "series",
        name: "Dark",
        year: 2017,
        posterPath: null,
        actors: [],
        seasonsTotal: 3,
      },
    });

    await redirectedTo(() => addFromTmdbAction("series", 70523));

    expect(addTitle).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "series", seasonsTotal: 3 }),
    );
  });

  test("A1: from Vistas it starts watched with today (Madrid)", async () => {
    await redirectedTo(() => addFromTmdbAction("movie", 438631, "vistas"));

    expect(addTitle).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "watched",
        watchDate: { kind: "known", date: "2026-10-30" },
      }),
    );
  });

  test.each([["pendientes"], [undefined], ["bogus"]])(
    "A1: origin %j starts pending (no state sent)",
    async (desde) => {
      await redirectedTo(() => addFromTmdbAction("movie", 438631, desde as never));

      const sent = vi.mocked(addTitle).mock.calls[0]?.[0] as Record<string, unknown>;
      expect(sent).not.toHaveProperty("state");
      expect(sent).not.toHaveProperty("watchDate");
    },
  );

  test("TMDB failure returns the failure, creates nothing and does not redirect", async () => {
    vi.mocked(getTmdbDetails).mockResolvedValue({
      ok: false,
      error: { kind: "unavailable" },
    });

    const target = await redirectedTo(async () => {
      expect(await addFromTmdbAction("movie", 1)).toEqual({
        ok: false,
        error: { kind: "unavailable" },
      });
    });

    expect(target).toBeNull();
    expect(addTitle).not.toHaveBeenCalled();
  });

  test("a duplicate is returned with the existing id and does not redirect", async () => {
    vi.mocked(addTitle).mockResolvedValue({
      ok: false,
      error: { kind: "duplicate", existingId: "abc" },
    });

    const target = await redirectedTo(async () => {
      expect(await addFromTmdbAction("movie", 438631)).toEqual({
        ok: false,
        error: { kind: "duplicate", existingId: "abc" },
      });
    });

    expect(target).toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("addManualAction", () => {
  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) data.set(key, value);
    return data;
  };

  test("creates a manual title from name and kind and redirects", async () => {
    const target = await redirectedTo(() =>
      addManualAction(null, form({ name: "Mi peli", kind: "movie" })),
    );

    expect(addTitle).toHaveBeenCalledWith({ name: "Mi peli", kind: "movie" });
    expect(target).toBe(`/titulo/${ID}`);
  });

  test("A1: desde=vistas starts watched with today", async () => {
    await redirectedTo(() =>
      addManualAction(null, form({ name: "Mi peli", kind: "series", desde: "vistas" })),
    );

    expect(addTitle).toHaveBeenCalledWith({
      name: "Mi peli",
      kind: "series",
      state: "watched",
      watchDate: { kind: "known", date: "2026-10-30" },
    });
  });

  test("a blank name returns the failure state for the form", async () => {
    vi.mocked(addTitle).mockResolvedValue({
      ok: false,
      error: { kind: "invalid_input", errors: [{ field: "name", code: "empty" }] },
    });

    const result = await addManualAction(null, form({ name: " ", kind: "movie" }));

    expect(result).toEqual({
      ok: false,
      error: { kind: "invalid_input", errors: [{ field: "name", code: "empty" }] },
    });
  });

  test("missing form fields reach the use case as undefined to be rejected there", async () => {
    vi.mocked(addTitle).mockResolvedValue({
      ok: false,
      error: { kind: "invalid_input", errors: [] },
    });

    await addManualAction(null, new FormData());

    expect(addTitle).toHaveBeenCalledWith({ name: undefined, kind: undefined });
  });
});

describe("deleteTitleAction", () => {
  test.each([
    ["watched", "/vistas"],
    ["watched_awful", "/vistas"],
    ["pending", "/pendientes"],
    ["urgent", "/pendientes"],
  ] as const)("a %s title redirects to %s", async (state, expected) => {
    vi.mocked(deleteTitle).mockResolvedValue({ ok: true, value: { state } });

    expect(await redirectedTo(() => deleteTitleAction(ID))).toBe(expected);
    expect(deleteTitle).toHaveBeenCalledWith(ID);
  });

  test("TD-8 S4: already deleted by the other person still lands on the list", async () => {
    vi.mocked(deleteTitle).mockResolvedValue({
      ok: false,
      error: { kind: "not_found" },
    });

    expect(await redirectedTo(() => deleteTitleAction(ID))).toBe("/vistas");
  });

  test("other failures are returned without redirecting", async () => {
    vi.mocked(deleteTitle).mockResolvedValue({
      ok: false,
      error: { kind: "unauthorized" },
    });

    const target = await redirectedTo(async () => {
      expect(await deleteTitleAction(ID)).toEqual({
        ok: false,
        error: { kind: "unauthorized" },
      });
    });

    expect(target).toBeNull();
  });
});
