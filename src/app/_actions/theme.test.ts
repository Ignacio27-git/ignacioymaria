// @vitest-environment node
import { cookies } from "next/headers";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { setThemeAction } from "./theme";

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

test.each(["dark", "light"] as const)("stores %s in the theme cookie", async (value) => {
  await setThemeAction(value);

  expect(set).toHaveBeenCalledTimes(1);
  expect(set).toHaveBeenCalledWith("theme", value, expect.any(Object));
  expect(remove).not.toHaveBeenCalled();
});

test("stores it for a year, site-wide, Lax and httpOnly", async () => {
  await setThemeAction("dark");

  expect(set).toHaveBeenCalledWith("theme", "dark", {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: false,
  });
});

test("marks the cookie secure in production", async () => {
  vi.stubEnv("NODE_ENV", "production");

  await setThemeAction("light");

  expect(set).toHaveBeenCalledWith(
    "theme",
    "light",
    expect.objectContaining({ secure: true }),
  );
});

test("system deletes the cookie instead of storing it", async () => {
  await setThemeAction("system");

  expect(remove).toHaveBeenCalledWith("theme");
  expect(set).not.toHaveBeenCalled();
});

test.each([
  ["an unknown word", "purple"],
  ["an empty string", ""],
  ["the wrong case", "Dark"],
  ["undefined", undefined],
  ["a number", 3],
  ["an object", { theme: "dark" }],
])("ignores %s: nothing is stored or deleted", async (_label, value) => {
  await setThemeAction(value);

  expect(set).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
});
