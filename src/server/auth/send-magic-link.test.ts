// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createClient } from "@/lib/supabase/server";

import { sendMagicLink } from "./send-magic-link";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const signInWithOtp = vi.fn();

beforeEach(() => {
  vi.stubEnv("SITE_URL", "http://127.0.0.1:3000/");
  vi.mocked(createClient).mockResolvedValue({
    auth: { signInWithOtp },
  } as never);
  signInWithOtp.mockResolvedValue({ data: {}, error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("validation", () => {
  test.each(["", "   ", "no-at-sign", "a@b", "two words@x.test"])(
    "rejects %j as invalid without calling the provider",
    async (raw) => {
      expect(await sendMagicLink(raw)).toEqual({ status: "invalid" });
      expect(signInWithOtp).not.toHaveBeenCalled();
    },
  );
});

describe("submission", () => {
  test("trims and lowercases the email", async () => {
    await sendMagicLink("  Ana@Example.TEST ");

    expect(signInWithOtp).toHaveBeenCalledTimes(1);
    expect(signInWithOtp.mock.calls[0][0].email).toBe("ana@example.test");
  });

  test("redirects to /auth/confirm on the configured site and may create the user", async () => {
    await sendMagicLink("ana@example.test");

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "ana@example.test",
      options: {
        emailRedirectTo: "http://127.0.0.1:3000/auth/confirm",
        shouldCreateUser: true,
      },
    });
  });

  test("answers 'sent' on success", async () => {
    expect(await sendMagicLink("ana@example.test")).toEqual({ status: "sent" });
  });
});

describe("provider failures never reveal anything", () => {
  test("answers 'sent' when the provider rejects (hook, rate limit)", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    signInWithOtp.mockResolvedValue({
      data: {},
      error: { code: "unexpected_failure", message: "secret provider text" },
    });

    expect(await sendMagicLink("eve@example.test")).toEqual({ status: "sent" });
    expect(log).toHaveBeenCalledWith(
      "sendMagicLink failed",
      "unexpected_failure",
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret provider text");
  });

  test("answers 'sent' when the call throws", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    signInWithOtp.mockRejectedValue(new Error("network down"));

    expect(await sendMagicLink("ana@example.test")).toEqual({ status: "sent" });
    expect(log).toHaveBeenCalledWith("sendMagicLink failed", "exception");
  });

  test("answers 'sent' when the client cannot be created", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(createClient).mockRejectedValue(new Error("missing env"));

    expect(await sendMagicLink("ana@example.test")).toEqual({ status: "sent" });
  });
});
