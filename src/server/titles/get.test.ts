// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { getCurrentPerson } from "@/server/auth/current-person";

import { getTitle } from "./get";
import { getTitlesRepository } from "./repository";
import { fakeRepository, makeRecord, TITLE_ID } from "./test-helpers";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/current-person", () => ({ getCurrentPerson: vi.fn() }));
vi.mock("./repository", () => ({ getTitlesRepository: vi.fn() }));

const repo = fakeRepository();

beforeEach(() => {
  vi.mocked(getCurrentPerson).mockResolvedValue("maria");
  vi.mocked(getTitlesRepository).mockResolvedValue(repo as never);
});

afterEach(() => {
  vi.clearAllMocks();
  Object.values(repo).forEach((fn) => fn.mockReset());
});

test("TD-1 S1: one score only gives an average equal to it", async () => {
  repo.findById.mockResolvedValue({
    ok: true,
    value: makeRecord({ scores: { maria: 7.25 } }),
  });

  const result = await getTitle(TITLE_ID);

  expect(repo.findById).toHaveBeenCalledWith(TITLE_ID);
  expect(result.ok && result.value.average).toBe(7.25);
  expect(result.ok && result.value.title.scores.ignacio).toBeNull();
});

test("TD-1 S2: no scores gives a null average, never an error", async () => {
  repo.findById.mockResolvedValue({ ok: true, value: makeRecord() });

  const result = await getTitle(TITLE_ID);

  expect(result.ok && result.value.average).toBeNull();
});

test("TD-1 S3: an unknown id is not_found", async () => {
  repo.findById.mockResolvedValue({ ok: false, error: { kind: "not_found" } });

  expect(await getTitle(TITLE_ID)).toEqual({
    ok: false,
    error: { kind: "not_found" },
  });
});

test.each(["nope", "", 42, null, undefined])(
  "TD-1 S4: non-uuid id %j is not_found with no database call",
  async (id) => {
    expect(await getTitle(id)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
    expect(getTitlesRepository).not.toHaveBeenCalled();
  },
);

test("without a person it answers unauthorized and touches nothing", async () => {
  vi.mocked(getCurrentPerson).mockResolvedValue(null);

  expect(await getTitle(TITLE_ID)).toEqual({
    ok: false,
    error: { kind: "unauthorized" },
  });
  expect(getTitlesRepository).not.toHaveBeenCalled();
});
