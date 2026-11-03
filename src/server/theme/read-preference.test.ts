// @vitest-environment node
import { cookies } from "next/headers";
import { afterEach, expect, test, vi } from "vitest";

import { readThemePreference } from "./read-preference";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

function withCookie(value: string | undefined) {
  const get = vi.fn((name: string) =>
    name === "theme" && value !== undefined ? { name, value } : undefined,
  );
  vi.mocked(cookies).mockResolvedValue({ get } as never);
  return get;
}

afterEach(() => {
  vi.clearAllMocks();
});

test.each(["dark", "light", "system"] as const)(
  "returns the stored %s preference",
  async (value) => {
    const get = withCookie(value);

    await expect(readThemePreference()).resolves.toBe(value);
    expect(get).toHaveBeenCalledWith("theme");
  },
);

test("returns system when the cookie is absent", async () => {
  withCookie(undefined);

  await expect(readThemePreference()).resolves.toBe("system");
});

test.each(["purple", "", "DARK"])(
  "returns system for the invalid value %j without throwing",
  async (value) => {
    withCookie(value);

    await expect(readThemePreference()).resolves.toBe("system");
  },
);
