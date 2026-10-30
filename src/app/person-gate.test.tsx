import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import { beforeEach, expect, test, vi } from "vitest";

import { getCurrentPerson } from "@/server/auth/current-person";

import { PersonGate } from "./person-gate";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/server/auth/current-person", () => ({ getCurrentPerson: vi.fn() }));

class RedirectSignal extends Error {}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(redirect).mockImplementation((() => {
    throw new RedirectSignal("NEXT_REDIRECT");
  }) as never);
});

test.each([
  ["ignacio", "Sesión iniciada como Ignacio"],
  ["maria", "Sesión iniciada como María"],
] as const)("renders who is signed in (%s)", async (person, text) => {
  vi.mocked(getCurrentPerson).mockResolvedValue(person);

  render(await PersonGate());

  expect(screen.getByText(text)).toBeInTheDocument();
  expect(redirect).not.toHaveBeenCalled();
});

test("sends a session without a person back to /login", async () => {
  vi.mocked(getCurrentPerson).mockResolvedValue(null);

  await expect(PersonGate()).rejects.toBeInstanceOf(RedirectSignal);
  expect(redirect).toHaveBeenCalledWith("/login");
});
