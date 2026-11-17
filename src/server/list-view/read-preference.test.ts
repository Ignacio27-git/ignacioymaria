// @vitest-environment node
import { cookies } from "next/headers";
import { afterEach, expect, test, vi } from "vitest";

import { readListView } from "./read-preference";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

function withCookie(value: string | undefined) {
  const get = vi.fn((name: string) =>
    name === "list_view" && value !== undefined ? { name, value } : undefined,
  );
  vi.mocked(cookies).mockResolvedValue({ get } as never);
  return get;
}

afterEach(() => {
  vi.clearAllMocks();
});

test.each(["table", "grid"] as const)("returns the stored %s view", async (value) => {
  const get = withCookie(value);

  await expect(readListView()).resolves.toBe(value);
  expect(get).toHaveBeenCalledWith("list_view");
});

test("returns the table when the cookie is absent", async () => {
  withCookie(undefined);

  await expect(readListView()).resolves.toBe("table");
});

test.each(["purple", "", "GRID"])(
  "returns the table for the invalid value %j without throwing",
  async (value) => {
    withCookie(value);

    await expect(readListView()).resolves.toBe("table");
  },
);
