// @vitest-environment node
import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { updateSession } from "./proxy";

vi.mock("server-only", () => ({}));
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));

const getClaims = vi.fn();
const getSession = vi.fn();

type SetAll = (
  cookies: { name: string; value: string; options?: object }[],
) => void;

function capturedSetAll(): SetAll {
  const options = vi.mocked(createServerClient).mock.calls[0][2];
  return (options.cookies as unknown as { setAll: SetAll }).setAll;
}

const request = (path: string, cookie?: string) =>
  new NextRequest(`http://internal.test:3000${path}`, {
    headers: cookie ? { cookie } : undefined,
  });

// The request host is deliberately different from SITE_URL: redirects must
// stay on the configured site (Next normalizes 127.0.0.1 to localhost).
const loginRedirect = (response: Response) =>
  new URL(response.headers.get("location") ?? "").href;

beforeEach(() => {
  vi.stubEnv("SITE_URL", "http://127.0.0.1:3000");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
  vi.mocked(createServerClient).mockReturnValue({
    auth: { getClaims, getSession },
  } as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("unauthenticated requests", () => {
  test("redirect a protected path to /login", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });

    const response = await updateSession(request("/"));

    expect(response.status).toBe(307);
    expect(loginRedirect(response)).toBe("http://127.0.0.1:3000/login");
  });

  test("treat a tampered or unverifiable session as unauthenticated", async () => {
    getClaims.mockResolvedValue({
      data: null,
      error: new Error("invalid JWT signature"),
    });

    const response = await updateSession(request("/titles", "sb-x=garbage"));

    expect(response.status).toBe(307);
    expect(loginRedirect(response)).toBe("http://127.0.0.1:3000/login");
  });

  test.each(["/login", "/auth/confirm"])("let %s through", async (path) => {
    getClaims.mockResolvedValue({ data: null, error: null });

    const response = await updateSession(request(path));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("authenticated requests", () => {
  test("pass through a protected path", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1", email: "a@t.example" } },
      error: null,
    });

    const response = await updateSession(request("/"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  test("validate with getClaims and never trust getSession", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });

    await updateSession(request("/"));

    expect(getClaims).toHaveBeenCalledTimes(1);
    expect(getSession).not.toHaveBeenCalled();
  });

  test("carry refreshed cookies on the passing response", async () => {
    getClaims.mockImplementation(async () => {
      capturedSetAll()([{ name: "sb-a", value: "fresh", options: { path: "/" } }]);
      return { data: { claims: { sub: "u1" } }, error: null };
    });

    const response = await updateSession(request("/"));

    expect(response.cookies.get("sb-a")?.value).toBe("fresh");
  });
});

test("carries refreshed cookies on the redirect response too", async () => {
  getClaims.mockImplementation(async () => {
    capturedSetAll()([{ name: "sb-a", value: "", options: { maxAge: 0 } }]);
    return { data: null, error: null };
  });

  const response = await updateSession(request("/"));

  expect(response.status).toBe(307);
  expect(response.cookies.get("sb-a")?.value).toBe("");
});

test("reads the request cookies for the client", async () => {
  getClaims.mockResolvedValue({ data: null, error: null });

  await updateSession(request("/login", "sb-a=1"));

  const options = vi.mocked(createServerClient).mock.calls[0][2];
  const cookies = options.cookies as unknown as {
    getAll: () => { name: string; value: string }[];
  };
  expect(cookies.getAll()).toEqual([{ name: "sb-a", value: "1" }]);
});
