// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createClient } from "@/lib/supabase/server";

import { getCurrentPerson, scoreColumnFor } from "./current-person";

vi.mock("server-only", () => ({}));
// Recorded at import time: mock call counts are cleared before each test.
const cachedFunctions = vi.hoisted(() => [] as unknown[]);
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T,>(fn: T) => {
    cachedFunctions.push(fn);
    return fn;
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const rpc = vi.fn();

beforeEach(() => {
  vi.mocked(createClient).mockResolvedValue({ rpc } as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("getCurrentPerson", () => {
  // Layout and use cases share one RPC per request through React cache().
  test("is wrapped in React cache()", () => {
    expect(cachedFunctions).toHaveLength(1);
    expect(cachedFunctions[0]).toBeTypeOf("function");
  });

  test.each(["ignacio", "maria"])("returns %s from the database", async (p) => {
    rpc.mockResolvedValue({ data: p, error: null });

    expect(await getCurrentPerson()).toBe(p);
    expect(rpc).toHaveBeenCalledWith("current_person");
  });

  test("returns null when the database has no person", async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    expect(await getCurrentPerson()).toBeNull();
  });

  test("returns null for an unexpected value", async () => {
    rpc.mockResolvedValue({ data: "bob", error: null });

    expect(await getCurrentPerson()).toBeNull();
  });

  test("returns null when the rpc fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: "ignacio", error: { code: "PGRST301" } });

    expect(await getCurrentPerson()).toBeNull();
  });
});

describe("scoreColumnFor", () => {
  test("maps each person to their own score column", () => {
    expect(scoreColumnFor("ignacio")).toBe("score_ignacio");
    expect(scoreColumnFor("maria")).toBe("score_maria");
  });
});
