// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { createClient } from "@/lib/supabase/server";

import { signOut } from "./sign-out";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const supabaseSignOut = vi.fn();

beforeEach(() => {
  vi.mocked(createClient).mockResolvedValue({
    auth: { signOut: supabaseSignOut },
  } as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

test("signs the current session out", async () => {
  supabaseSignOut.mockResolvedValue({ error: null });

  await signOut();

  expect(supabaseSignOut).toHaveBeenCalledTimes(1);
});

test("does not throw when there is no session", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  supabaseSignOut.mockResolvedValue({
    error: { code: "session_not_found", message: "Auth session missing" },
  });

  await expect(signOut()).resolves.toBeUndefined();
});

test("does not throw when the call itself throws", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  supabaseSignOut.mockRejectedValue(new Error("network down"));

  await expect(signOut()).resolves.toBeUndefined();
});
