// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createClient } from "@/lib/supabase/server";

import { GET } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const verifyOtp = vi.fn();

const call = (query: string) =>
  GET(new NextRequest(`http://127.0.0.1:3000/auth/confirm${query}`));

const target = (response: Response) => {
  const url = new URL(response.headers.get("location") ?? "");
  return `${url.origin}${url.pathname}${url.search}`;
};

beforeEach(() => {
  vi.stubEnv("SITE_URL", "http://127.0.0.1:3000");
  vi.mocked(createClient).mockResolvedValue({ auth: { verifyOtp } } as never);
  verifyOtp.mockResolvedValue({ data: {}, error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("a valid link", () => {
  test("verifies the token hash as an email OTP and redirects to the root", async () => {
    const response = await call("?token_hash=abc&type=email");

    expect(verifyOtp).toHaveBeenCalledWith({ type: "email", token_hash: "abc" });
    expect(response.status).toBe(302);
    expect(target(response)).toBe("http://127.0.0.1:3000/");
  });

  test("ignores a next parameter (no open redirect)", async () => {
    for (const next of ["https://evil.example", "//evil.example", "/titles"]) {
      const response = await call(
        `?token_hash=abc&type=email&next=${encodeURIComponent(next)}`,
      );

      expect(target(response)).toBe("http://127.0.0.1:3000/");
    }
  });
});

describe("an invalid link redirects to /login without a query", () => {
  test.each([
    ["missing token_hash", "?type=email"],
    ["empty token_hash", "?token_hash=&type=email"],
    ["missing type", "?token_hash=abc"],
    ["other type", "?token_hash=abc&type=recovery"],
    ["no parameters", ""],
  ])("%s", async (_name, query) => {
    const response = await call(query);

    expect(verifyOtp).not.toHaveBeenCalled();
    expect(response.status).toBe(302);
    expect(target(response)).toBe("http://127.0.0.1:3000/login");
  });

  test("when verification fails (expired, used or garbage)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    verifyOtp.mockResolvedValue({
      data: {},
      error: { code: "otp_expired", message: "Token has expired" },
    });

    const response = await call("?token_hash=abc&type=email");

    expect(verifyOtp).toHaveBeenCalledTimes(1);
    expect(target(response)).toBe("http://127.0.0.1:3000/login");
  });

  test("when verification throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    verifyOtp.mockRejectedValue(new Error("network down"));

    const response = await call("?token_hash=abc&type=email");

    expect(target(response)).toBe("http://127.0.0.1:3000/login");
  });
});
