// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getCurrentPerson } from "@/server/auth/current-person";

import { getTitlesRepository } from "./repository";
import { fakeRepository, makeRecord, TITLE_ID } from "./test-helpers";
import { updateSeasonField } from "./update-season";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/current-person", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth/current-person")>()),
  getCurrentPerson: vi.fn(),
}));
vi.mock("./repository", () => ({ getTitlesRepository: vi.fn() }));

const repo = fakeRepository();

const series = (
  seasons: Record<string, unknown>[] = [{ number: 1 }, { number: 2 }],
) => makeRecord({ kind: "series", seasons });

beforeEach(() => {
  vi.useFakeTimers();
  // 2026-10-30 23:30 UTC is already 31 Oct in Madrid.
  vi.setSystemTime(new Date("2026-10-30T23:30:00Z"));
  vi.mocked(getCurrentPerson).mockResolvedValue("maria");
  vi.mocked(getTitlesRepository).mockResolvedValue(repo as never);
  repo.findById.mockImplementation(async () => ({ ok: true, value: series() }));
  repo.updateSeason.mockResolvedValue({ ok: true, value: null });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  Object.values(repo).forEach((fn) => fn.mockReset());
});

describe("identity and input", () => {
  test("without a person it answers unauthorized and touches nothing", async () => {
    vi.mocked(getCurrentPerson).mockResolvedValue(null);

    expect(
      await updateSeasonField(TITLE_ID, 1, { field: "state", value: "pending" }),
    ).toEqual({ ok: false, error: { kind: "unauthorized" } });
    expect(getTitlesRepository).not.toHaveBeenCalled();
  });

  test.each(["nope", 42, null])(
    "a non-uuid id %j is not_found with no database call",
    async (id) => {
      expect(
        await updateSeasonField(id, 1, { field: "state", value: "pending" }),
      ).toEqual({ ok: false, error: { kind: "not_found" } });
      expect(getTitlesRepository).not.toHaveBeenCalled();
    },
  );

  test.each([0, -1, 1.5, "1", null, undefined])(
    "season number %j is invalid_input with no write",
    async (number) => {
      const result = await updateSeasonField(TITLE_ID, number, {
        field: "state",
        value: "pending",
      });

      expect(result).toEqual({
        ok: false,
        error: {
          kind: "invalid_input",
          errors: [{ field: "season", code: "not_positive_integer" }],
        },
      });
      expect(repo.updateSeason).not.toHaveBeenCalled();
    },
  );

  test.each([
    ["not an object", null],
    ["unknown field", { field: "observations", value: "x" }],
    ["a column named by the client", { field: "score_ignacio", value: 5 }],
  ])("%s is invalid_input and writes nothing", async (_label, patch) => {
    const result = await updateSeasonField(TITLE_ID, 1, patch);

    expect(!result.ok && result.error.kind).toBe("invalid_input");
    expect(repo.updateSeason).not.toHaveBeenCalled();
  });
});

describe("existence", () => {
  test("a season that does not exist is not_found", async () => {
    expect(
      await updateSeasonField(TITLE_ID, 9, { field: "state", value: "pending" }),
    ).toEqual({ ok: false, error: { kind: "not_found" } });
    expect(repo.updateSeason).not.toHaveBeenCalled();
  });

  test("a movie has no seasons: not_found", async () => {
    repo.findById.mockResolvedValue({ ok: true, value: makeRecord() });

    expect(
      await updateSeasonField(TITLE_ID, 1, { field: "state", value: "pending" }),
    ).toEqual({ ok: false, error: { kind: "not_found" } });
  });

  test("a failing read of the title is returned", async () => {
    repo.findById.mockResolvedValue({
      ok: false,
      error: { kind: "unavailable" },
    });

    expect(
      await updateSeasonField(TITLE_ID, 1, { field: "state", value: "pending" }),
    ).toEqual({ ok: false, error: { kind: "unavailable" } });
  });
});

describe("myScore (S24, S30)", () => {
  test.each([
    ["maria", "score_maria"],
    ["ignacio", "score_ignacio"],
  ] as const)(
    "%s writes %s only, derived from the session",
    async (person, column) => {
      vi.mocked(getCurrentPerson).mockResolvedValue(person);

      await updateSeasonField(TITLE_ID, 2, {
        field: "myScore",
        value: 9.5,
        // A client naming another column or person is ignored.
        column: "score_ignacio",
        person: "ignacio",
      });

      expect(repo.updateSeason).toHaveBeenCalledWith(TITLE_ID, 2, {
        [column]: 9.5,
      });
    },
  );

  test("null clears the own score", async () => {
    await updateSeasonField(TITLE_ID, 1, { field: "myScore", value: null });

    expect(repo.updateSeason).toHaveBeenCalledWith(TITLE_ID, 1, {
      score_maria: null,
    });
  });

  test.each([11, 7.3, -1, "7", Number.NaN])(
    "S30: score %j is rejected and nothing is saved",
    async (value) => {
      const result = await updateSeasonField(TITLE_ID, 1, {
        field: "myScore",
        value,
      });

      expect(!result.ok && result.error.kind).toBe("invalid_input");
      expect(repo.updateSeason).not.toHaveBeenCalled();
    },
  );

  test("a database 42501 comes back as forbidden", async () => {
    repo.updateSeason.mockResolvedValue({
      ok: false,
      error: { kind: "forbidden" },
    });

    expect(
      await updateSeasonField(TITLE_ID, 1, { field: "myScore", value: 5 }),
    ).toEqual({ ok: false, error: { kind: "forbidden" } });
  });
});

describe("state and date (S25)", () => {
  test("a state outside the legend is invalid_state with no write", async () => {
    const result = await updateSeasonField(TITLE_ID, 1, {
      field: "state",
      value: "archived",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "invalid_input",
        errors: [{ field: "state", code: "invalid_state" }],
      },
    });
    expect(repo.updateSeason).not.toHaveBeenCalled();
  });

  test.each([
    "watched",
    "watched_rewatch",
    "watched_no_rewatch",
    "watched_awful",
  ])(
    "D-68: moving a season with an unknown date to %s saves today (Madrid)",
    async (state) => {
      await updateSeasonField(TITLE_ID, 1, { field: "state", value: state });

      expect(repo.updateSeason).toHaveBeenCalledWith(TITLE_ID, 1, {
        state,
        watch_date: "2026-10-31",
      });
    },
  );

  test("a known season date is respected", async () => {
    repo.findById.mockResolvedValue({
      ok: true,
      value: series([
        { number: 1, watchDate: { kind: "known", date: "2026-01-02" } },
      ]),
    });

    await updateSeasonField(TITLE_ID, 1, { field: "state", value: "watched" });

    expect(repo.updateSeason).toHaveBeenCalledWith(TITLE_ID, 1, {
      state: "watched",
    });
  });

  test.each(["pending", "urgent"])(
    "non-watched state %s never touches the date",
    async (state) => {
      await updateSeasonField(TITLE_ID, 1, { field: "state", value: state });

      expect(repo.updateSeason).toHaveBeenCalledWith(TITLE_ID, 1, { state });
    },
  );

  test("a known date is written as YYYY-MM-DD and unknown as null", async () => {
    await updateSeasonField(TITLE_ID, 1, {
      field: "watchDate",
      value: { kind: "known", date: "2026-05-01" },
    });
    expect(repo.updateSeason).toHaveBeenLastCalledWith(TITLE_ID, 1, {
      watch_date: "2026-05-01",
    });

    await updateSeasonField(TITLE_ID, 1, {
      field: "watchDate",
      value: { kind: "unknown" },
    });
    expect(repo.updateSeason).toHaveBeenLastCalledWith(TITLE_ID, 1, {
      watch_date: null,
    });
  });

  test("an invalid date is invalid_input with no write", async () => {
    const result = await updateSeasonField(TITLE_ID, 1, {
      field: "watchDate",
      value: { kind: "known", date: "2026-02-31" },
    });

    expect(!result.ok && result.error).toEqual({
      kind: "invalid_input",
      errors: [{ field: "watchDate", code: "invalid_date" }],
    });
    expect(repo.updateSeason).not.toHaveBeenCalled();
  });
});

describe("result", () => {
  test("returns the fresh view re-read after the write, with the summary", async () => {
    repo.findById
      .mockResolvedValueOnce({ ok: true, value: series() })
      .mockResolvedValueOnce({
        ok: true,
        value: series([
          { number: 1, state: "watched", scores: { maria: 8 } },
          { number: 2, state: "pending", scores: { maria: 6 } },
        ]),
      });

    const result = await updateSeasonField(TITLE_ID, 2, {
      field: "myScore",
      value: 6,
    });

    expect(repo.findById).toHaveBeenCalledTimes(2);
    expect(result.ok && result.value.summary).toMatchObject({
      state: "pending",
      scores: { maria: 7, ignacio: null },
      average: 7,
    });
  });

  test("a failing re-read is returned after a successful write", async () => {
    repo.findById
      .mockResolvedValueOnce({ ok: true, value: series() })
      .mockResolvedValueOnce({ ok: false, error: { kind: "unavailable" } });

    expect(
      await updateSeasonField(TITLE_ID, 1, { field: "myScore", value: 5 }),
    ).toEqual({ ok: false, error: { kind: "unavailable" } });
  });
});
