// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getCurrentPerson } from "@/server/auth/current-person";

import { addSeason } from "./add-season";
import { getTitlesRepository } from "./repository";
import { fakeRepository, makeRecord, TITLE_ID } from "./test-helpers";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/current-person", () => ({ getCurrentPerson: vi.fn() }));
vi.mock("./repository", () => ({ getTitlesRepository: vi.fn() }));

const repo = fakeRepository();

const series = (seasons: Record<string, unknown>[]) =>
  makeRecord({ kind: "series", state: "watched", seasons });

beforeEach(() => {
  vi.mocked(getCurrentPerson).mockResolvedValue("ignacio");
  vi.mocked(getTitlesRepository).mockResolvedValue(repo as never);
  repo.insertSeason.mockResolvedValue({ ok: true, value: null });
});

afterEach(() => {
  vi.clearAllMocks();
  Object.values(repo).forEach((fn) => fn.mockReset());
});

describe("addSeason (R5.3)", () => {
  test("S26: adds highest + 1 as pending, no date, no scores", async () => {
    repo.findById
      .mockResolvedValueOnce({
        ok: true,
        value: series([
          { number: 1, state: "watched" },
          { number: 2, state: "watched" },
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        value: series([
          { number: 1, state: "watched" },
          { number: 2, state: "watched" },
          { number: 3, state: "pending" },
        ]),
      });

    const result = await addSeason(TITLE_ID);

    expect(repo.insertSeason).toHaveBeenCalledWith({
      title_id: TITLE_ID,
      season_number: 3,
      state: "pending",
      watch_date: null,
    });
    expect(result.ok && result.value.summary.state).toBe("pending");
  });

  test("uses the highest number when there are gaps", async () => {
    repo.findById.mockResolvedValue({
      ok: true,
      value: series([{ number: 1 }, { number: 4 }]),
    });

    await addSeason(TITLE_ID);

    expect(repo.insertSeason).toHaveBeenCalledWith(
      expect.objectContaining({ season_number: 5 }),
    );
  });

  test("S27: a series without seasons gets season 1", async () => {
    repo.findById.mockResolvedValue({ ok: true, value: series([]) });

    await addSeason(TITLE_ID);

    expect(repo.insertSeason).toHaveBeenCalledWith({
      title_id: TITLE_ID,
      season_number: 1,
      state: "pending",
      watch_date: null,
    });
  });

  test("a movie cannot get seasons", async () => {
    repo.findById.mockResolvedValue({ ok: true, value: makeRecord() });

    expect(await addSeason(TITLE_ID)).toEqual({
      ok: false,
      error: {
        kind: "invalid_input",
        errors: [{ field: "kind", code: "not_a_series" }],
      },
    });
    expect(repo.insertSeason).not.toHaveBeenCalled();
  });

  test("an unknown title is not_found", async () => {
    repo.findById.mockResolvedValue({
      ok: false,
      error: { kind: "not_found" },
    });

    expect(await addSeason(TITLE_ID)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
    expect(repo.insertSeason).not.toHaveBeenCalled();
  });

  test("a concurrent add (duplicate number) is returned as a failure", async () => {
    repo.findById.mockResolvedValue({
      ok: true,
      value: series([{ number: 1 }]),
    });
    repo.insertSeason.mockResolvedValue({
      ok: false,
      error: { kind: "duplicate", existingId: null },
    });

    expect(await addSeason(TITLE_ID)).toEqual({
      ok: false,
      error: { kind: "duplicate", existingId: null },
    });
  });
});

describe("identity and ids", () => {
  test("without a person it answers unauthorized and touches nothing", async () => {
    vi.mocked(getCurrentPerson).mockResolvedValue(null);

    expect(await addSeason(TITLE_ID)).toEqual({
      ok: false,
      error: { kind: "unauthorized" },
    });
    expect(getTitlesRepository).not.toHaveBeenCalled();
  });

  test.each(["nope", 3, null])("a non-uuid id %j is not_found", async (id) => {
    expect(await addSeason(id)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
    expect(getTitlesRepository).not.toHaveBeenCalled();
  });
});
