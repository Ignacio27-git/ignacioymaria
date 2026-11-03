// @vitest-environment node
import { redirect } from "next/navigation";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { sendMagicLink } from "@/server/auth/send-magic-link";
import { signOut } from "@/server/auth/sign-out";

import { requestMagicLinkAction, signOutAction } from "./auth";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/server/auth/send-magic-link", () => ({ sendMagicLink: vi.fn() }));
vi.mock("@/server/auth/sign-out", () => ({ signOut: vi.fn() }));

beforeEach(() => {
  vi.mocked(sendMagicLink).mockResolvedValue({ status: "sent" });
});

afterEach(() => {
  vi.clearAllMocks();
});

test("requestMagicLinkAction forwards the submitted email and returns the state", async () => {
  const form = new FormData();
  form.set("email", "ana@example.test");

  const state = await requestMagicLinkAction({ status: "idle" }, form);

  expect(sendMagicLink).toHaveBeenCalledWith("ana@example.test");
  expect(state).toEqual({ status: "sent" });
});

test("requestMagicLinkAction treats a missing or non-text email as empty", async () => {
  vi.mocked(sendMagicLink).mockResolvedValue({ status: "invalid" });

  const missing = await requestMagicLinkAction({ status: "idle" }, new FormData());
  const file = new FormData();
  file.set("email", new File(["x"], "x.txt"));
  const nonText = await requestMagicLinkAction({ status: "idle" }, file);

  expect(sendMagicLink).toHaveBeenNthCalledWith(1, "");
  expect(sendMagicLink).toHaveBeenNthCalledWith(2, "");
  expect(missing).toEqual({ status: "invalid" });
  expect(nonText).toEqual({ status: "invalid" });
});

test("signOutAction signs out and then redirects to /login", async () => {
  const order: string[] = [];
  vi.mocked(signOut).mockImplementation(async () => {
    order.push("signOut");
  });
  vi.mocked(redirect).mockImplementation((() => {
    order.push("redirect");
  }) as never);

  await signOutAction();

  expect(order).toEqual(["signOut", "redirect"]);
  expect(redirect).toHaveBeenCalledWith("/login");
});
