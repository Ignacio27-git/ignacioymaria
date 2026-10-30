// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";

import { getPublicSupabaseEnv, getSiteUrl } from "./env";

vi.mock("server-only", () => ({}));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getPublicSupabaseEnv", () => {
  test("returns the url and publishable key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");

    expect(getPublicSupabaseEnv()).toEqual({
      url: "http://127.0.0.1:54321",
      publishableKey: "sb_publishable_x",
    });
  });

  test("throws naming the missing url variable", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");

    expect(() => getPublicSupabaseEnv()).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL",
    );
  });

  test("throws naming the missing key variable", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    expect(() => getPublicSupabaseEnv()).toThrow(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  });
});

describe("getSiteUrl", () => {
  test("returns SITE_URL as is when it has no trailing slash", () => {
    vi.stubEnv("SITE_URL", "http://127.0.0.1:3000");

    expect(getSiteUrl()).toBe("http://127.0.0.1:3000");
  });

  test("strips trailing slashes", () => {
    vi.stubEnv("SITE_URL", "https://example.test//");

    expect(getSiteUrl()).toBe("https://example.test");
  });

  test("throws when SITE_URL is missing", () => {
    vi.stubEnv("SITE_URL", "");

    expect(() => getSiteUrl()).toThrow("SITE_URL");
  });
});
