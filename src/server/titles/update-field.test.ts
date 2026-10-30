// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getCurrentPerson } from "@/server/auth/current-person";

import { getTitlesRepository } from "./repository";
import { fakeRepository, makeRecord, TITLE_ID } from "./test-helpers";
import { updateTitleField } from "./update-field";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/current-person", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth/current-person")>()),
  getCurrentPerson: vi.fn(),
}));
vi.mock("./repository", () => ({ getTitlesRepository: vi.fn() }));

const repo = fakeRepository();

beforeEach(() => {
  vi.useFakeTimers();
  // 2026-10-30 23:30 UTC is already 31 Oct in Madrid (CET, UTC+1).
  vi.setSystemTime(new Date("2026-10-30T23:30:00Z"));
  vi.mocked(getCurrentPerson).mockResolvedValue("maria");
  vi.mocked(getTitlesRepository).mockResolvedValue(repo as never);
  repo.update.mockImplementation(async () => ({ ok: true, value: makeRecord() }));
  repo.findById.mockImplementation(async () => ({ ok: true, value: makeRecord() }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  Object.values(repo).forEach((fn) => fn.mockReset());
});

describe("identity and ids", () => {
  test("without a person it answers unauthorized and touches nothing", async () => {
    vi.mocked(getCurrentPerson).mockResolvedValue(null);

    expect(
      await updateTitleField(TITLE_ID, { field: "observations", value: "x" }),
    ).toEqual({ ok: false, error: { kind: "unauthorized" } });
    expect(getTitlesRepository).not.toHaveBeenCalled();
  });

  test("a non-uuid id is not_found with no database call", async () => {
    expect(
      await updateTitleField("nope", { field: "observations", value: "x" }),
    ).toEqual({ ok: false, error: { kind: "not_found" } });
    expect(getTitlesRepository).not.toHaveBeenCalled();
  });
});

describe("patch shape", () => {
  test.each([
    ["not an object", null],
    ["unknown field", { field: "name", value: "x" }],
    ["a column named by the client", { field: "score_ignacio", value: 5 }],
  ])("%s is invalid_input and writes nothing", async (_label, patch) => {
    const result = await updateTitleField(TITLE_ID, patch);

    expect(!result.ok && result.error.kind).toBe("invalid_input");
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe("myScore (TC-6)", () => {
  test.each([
    ["maria", "score_maria"],
    ["ignacio", "score_ignacio"],
  ] as const)(
    "S1/S2: %s writes %s only, derived from the session",
    async (person, column) => {
      vi.mocked(getCurrentPerson).mockResolvedValue(person);

      await updateTitleField(TITLE_ID, {
        field: "myScore",
        value: 8.5,
        // A client trying to name another column is ignored.
        column: "score_ignacio",
        person: "ignacio",
      });

      expect(repo.update).toHaveBeenCalledWith(TITLE_ID, { [column]: 8.5 });
    },
  );

  test("null clears the own score", async () => {
    await updateTitleField(TITLE_ID, { field: "myScore", value: null });

    expect(repo.update).toHaveBeenCalledWith(TITLE_ID, { score_maria: null });
  });

  test.each([7.3, 11, -1, "7", Number.NaN])(
    "S5: score %j is rejected by the domain with no write",
    async (value) => {
      const result = await updateTitleField(TITLE_ID, { field: "myScore", value });

      expect(!result.ok && result.error.kind).toBe("invalid_input");
      expect(repo.update).not.toHaveBeenCalled();
    },
  );

  test("S3: a database 42501 comes back as forbidden", async () => {
    repo.update.mockResolvedValue({ ok: false, error: { kind: "forbidden" } });

    expect(
      await updateTitleField(TITLE_ID, { field: "myScore", value: 5 }),
    ).toEqual({ ok: false, error: { kind: "forbidden" } });
  });

  test("returns the fresh view with the average resolved", async () => {
    repo.update.mockResolvedValue({
      ok: true,
      value: makeRecord({ scores: { maria: 8, ignacio: 6 } }),
    });

    const result = await updateTitleField(TITLE_ID, { field: "myScore", value: 8 });

    expect(result.ok && result.value.average).toBe(7);
  });
});

describe("state and the A2 auto date", () => {
  test("S4: a state outside the legend is invalid_state with no write", async () => {
    const result = await updateTitleField(TITLE_ID, {
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
    expect(repo.update).not.toHaveBeenCalled();
  });

  test.each(["watched", "watched_rewatch", "watched_no_rewatch", "watched_awful"])(
    "A2: moving to %s with an unknown date saves today (Madrid) in the same write",
    async (state) => {
      repo.findById.mockResolvedValue({ ok: true, value: makeRecord() });

      await updateTitleField(TITLE_ID, { field: "state", value: state });

      expect(repo.update).toHaveBeenCalledTimes(1);
      expect(repo.update).toHaveBeenCalledWith(TITLE_ID, {
        state,
        watch_date: "2026-10-31",
      });
    },
  );

  test("A2: a known date is respected", async () => {
    repo.findById.mockResolvedValue({
      ok: true,
      value: makeRecord({ watchDate: { kind: "known", date: "2026-01-02" } }),
    });

    await updateTitleField(TITLE_ID, { field: "state", value: "watched" });

    expect(repo.update).toHaveBeenCalledWith(TITLE_ID, { state: "watched" });
  });

  test.each(["pending", "urgent"])(
    "A2: non-watched state %s never touches the date nor reads the row",
    async (state) => {
      await updateTitleField(TITLE_ID, { field: "state", value: state });

      expect(repo.findById).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(TITLE_ID, { state });
    },
  );

  test("a failing read of the current row is returned and nothing is written", async () => {
    repo.findById.mockResolvedValue({ ok: false, error: { kind: "not_found" } });

    expect(
      await updateTitleField(TITLE_ID, { field: "state", value: "watched" }),
    ).toEqual({ ok: false, error: { kind: "not_found" } });
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe("watchDate", () => {
  test("a known date is written as YYYY-MM-DD", async () => {
    await updateTitleField(TITLE_ID, {
      field: "watchDate",
      value: { kind: "known", date: "2026-05-01" },
    });

    expect(repo.update).toHaveBeenCalledWith(TITLE_ID, {
      watch_date: "2026-05-01",
    });
  });

  test("S6: unknown becomes null, and stays null after a watched state (A2)", async () => {
    await updateTitleField(TITLE_ID, {
      field: "watchDate",
      value: { kind: "unknown" },
    });

    expect(repo.update).toHaveBeenCalledWith(TITLE_ID, { watch_date: null });
    expect(repo.findById).not.toHaveBeenCalled();
  });

  test("TD-6 S4: an invalid date is invalid_input with no write", async () => {
    const result = await updateTitleField(TITLE_ID, {
      field: "watchDate",
      value: { kind: "known", date: "2026-02-31" },
    });

    expect(!result.ok && result.error).toEqual({
      kind: "invalid_input",
      errors: [{ field: "watchDate", code: "invalid_date" }],
    });
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe("observations", () => {
  test("keeps line breaks", async () => {
    await updateTitleField(TITLE_ID, {
      field: "observations",
      value: "uno\ndos",
    });

    expect(repo.update).toHaveBeenCalledWith(TITLE_ID, {
      observations: "uno\ndos",
    });
  });

  test.each(["", "  \n "])("blank %j is stored as null", async (value) => {
    await updateTitleField(TITLE_ID, { field: "observations", value });

    expect(repo.update).toHaveBeenCalledWith(TITLE_ID, { observations: null });
  });

  test("a non-string is invalid_input", async () => {
    const result = await updateTitleField(TITLE_ID, {
      field: "observations",
      value: 3,
    });

    expect(!result.ok && result.error.kind).toBe("invalid_input");
    expect(repo.update).not.toHaveBeenCalled();
  });
});
