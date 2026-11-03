// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { getCurrentPerson } from "@/server/auth/current-person";

import { deleteTitle } from "./delete";
import { getTitlesRepository } from "./repository";
import { fakeRepository, makeRecord, TITLE_ID } from "./test-helpers";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/current-person", () => ({ getCurrentPerson: vi.fn() }));
vi.mock("./repository", () => ({ getTitlesRepository: vi.fn() }));

const repo = fakeRepository();

beforeEach(() => {
  vi.mocked(getCurrentPerson).mockResolvedValue("ignacio");
  vi.mocked(getTitlesRepository).mockResolvedValue(repo as never);
  repo.findById.mockResolvedValue({
    ok: true,
    value: makeRecord({ state: "watched" }),
  });
  repo.remove.mockResolvedValue({ ok: true, value: { state: "watched" } });
});

afterEach(() => {
  vi.clearAllMocks();
  Object.values(repo).forEach((fn) => fn.mockReset());
});

test("S1: either person deletes by id and gets the removed state back", async () => {
  expect(await deleteTitle(TITLE_ID)).toEqual({
    ok: true,
    value: { state: "watched" },
  });
  expect(repo.remove).toHaveBeenCalledWith(TITLE_ID);
});

test("S2: an unknown id is not_found", async () => {
  repo.findById.mockResolvedValue({ ok: false, error: { kind: "not_found" } });

  expect(await deleteTitle(TITLE_ID)).toEqual({
    ok: false,
    error: { kind: "not_found" },
  });
});

test("a non-uuid id is not_found with no database call", async () => {
  expect(await deleteTitle("nope")).toEqual({
    ok: false,
    error: { kind: "not_found" },
  });
  expect(getTitlesRepository).not.toHaveBeenCalled();
});

test("without a person it answers unauthorized and touches nothing", async () => {
  vi.mocked(getCurrentPerson).mockResolvedValue(null);

  expect(await deleteTitle(TITLE_ID)).toEqual({
    ok: false,
    error: { kind: "unauthorized" },
  });
  expect(getTitlesRepository).not.toHaveBeenCalled();
});

test("R5.7: a series with seasons returns its derived state for the redirect", async () => {
  repo.findById.mockResolvedValue({
    ok: true,
    value: makeRecord({
      kind: "series",
      state: "watched",
      seasons: [
        { number: 1, state: "watched" },
        { number: 2, state: "pending" },
      ],
    }),
  });
  repo.remove.mockResolvedValue({ ok: true, value: { state: "watched" } });

  expect(await deleteTitle(TITLE_ID)).toEqual({
    ok: true,
    value: { state: "pending" },
  });
  expect(repo.remove).toHaveBeenCalledWith(TITLE_ID);
});

test("a delete failure after the lookup is returned as is", async () => {
  repo.remove.mockResolvedValue({ ok: false, error: { kind: "forbidden" } });

  expect(await deleteTitle(TITLE_ID)).toEqual({
    ok: false,
    error: { kind: "forbidden" },
  });
});
