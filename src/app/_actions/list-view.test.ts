// @vitest-environment node
import { cookies } from "next/headers";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { setListViewAction } from "./list-view";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

const set = vi.fn();
const remove = vi.fn();

beforeEach(() => {
  vi.mocked(cookies).mockResolvedValue({ set, delete: remove } as never);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

test.each(["table", "grid"] as const)(
  "stores %s in the list_view cookie, never deleting it",
  async (value) => {
    await setListViewAction(value);

    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith("list_view", value, expect.any(Object));
    expect(remove).not.toHaveBeenCalled();
  },
);

test("stores it for a year, site-wide, Lax and httpOnly", async () => {
  await setListViewAction("grid");

  expect(set).toHaveBeenCalledWith("list_view", "grid", {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: false,
  });
});

test("marks the cookie secure in production", async () => {
  vi.stubEnv("NODE_ENV", "production");

  await setListViewAction("grid");

  expect(set).toHaveBeenCalledWith(
    "list_view",
    "grid",
    expect.objectContaining({ secure: true }),
  );
});

test.each([
  ["an unknown word", "grid2"],
  ["an empty string", ""],
  ["the wrong case", "Grid"],
  ["undefined", undefined],
  ["a number", 3],
  ["an object", { view: "grid" }],
])("ignores %s: nothing is stored, nothing throws", async (_label, value) => {
  await expect(setListViewAction(value)).resolves.toBeUndefined();

  expect(set).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
});
