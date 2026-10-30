// @vitest-environment node
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { createClient } from "./server";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));

const store = {
  getAll: vi.fn(),
  set: vi.fn(),
};

type CookieAdapter = {
  getAll: () => unknown;
  setAll: (
    cookies: { name: string; value: string; options?: object }[],
  ) => void;
};

function adapter(): CookieAdapter {
  const options = vi.mocked(createServerClient).mock.calls[0][2];
  return options.cookies as unknown as CookieAdapter;
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
  vi.mocked(cookies).mockResolvedValue(store as never);
  vi.mocked(createServerClient).mockReturnValue({ marker: true } as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

test("creates a server client with the public url and key", async () => {
  const client = await createClient();

  expect(client).toEqual({ marker: true });
  expect(createServerClient).toHaveBeenCalledWith(
    "http://127.0.0.1:54321",
    "sb_publishable_x",
    expect.objectContaining({ cookies: expect.any(Object) }),
  );
});

test("reads cookies from the request cookie store", async () => {
  store.getAll.mockReturnValue([{ name: "sb-a", value: "1" }]);
  await createClient();

  expect(adapter().getAll()).toEqual([{ name: "sb-a", value: "1" }]);
});

test("writes refreshed cookies to the cookie store", async () => {
  await createClient();
  adapter().setAll([
    { name: "sb-a", value: "1", options: { path: "/" } },
    { name: "sb-b", value: "2" },
  ]);

  expect(store.set).toHaveBeenCalledTimes(2);
  expect(store.set).toHaveBeenCalledWith("sb-a", "1", { path: "/" });
  expect(store.set).toHaveBeenCalledWith("sb-b", "2", undefined);
});

test("ignores cookie writes that are not allowed (Server Components)", async () => {
  store.set.mockImplementation(() => {
    throw new Error("Cookies can only be modified in a Server Action");
  });
  await createClient();

  expect(() => adapter().setAll([{ name: "sb-a", value: "1" }])).not.toThrow();
  expect(store.set).toHaveBeenCalledTimes(1);
});
