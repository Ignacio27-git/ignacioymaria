import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { requestMagicLinkAction } from "@/app/_actions/auth";

import { LoginForm } from "./login-form";

vi.mock("@/app/_actions/auth", () => ({ requestMagicLinkAction: vi.fn() }));

const NEUTRAL = "Si este correo puede entrar, te llegará un enlace.";

function submit(email: string) {
  fireEvent.change(screen.getByLabelText("Correo electrónico"), {
    target: { value: email },
  });
  fireEvent.click(screen.getByRole("button", { name: "Enviar enlace" }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

test("shows the form and no message before submitting", () => {
  render(<LoginForm />);

  expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Enviar enlace" })).toBeEnabled();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("submits the typed email to the action", async () => {
  vi.mocked(requestMagicLinkAction).mockResolvedValue({ status: "sent" });
  render(<LoginForm />);

  submit("ana@example.test");

  await waitFor(() => expect(requestMagicLinkAction).toHaveBeenCalledTimes(1));
  const formData = vi.mocked(requestMagicLinkAction).mock.calls[0][1];
  expect(formData.get("email")).toBe("ana@example.test");
});

test("shows the neutral message when a link was requested", async () => {
  vi.mocked(requestMagicLinkAction).mockResolvedValue({ status: "sent" });
  render(<LoginForm />);

  submit("ana@example.test");

  expect(await screen.findByRole("status")).toHaveTextContent(NEUTRAL);
});

test("shows the exact same message for an address that cannot sign in", async () => {
  // The server reports every provider outcome as "sent": the UI cannot tell.
  vi.mocked(requestMagicLinkAction).mockResolvedValue({ status: "sent" });
  render(<LoginForm />);

  submit("eve@example.test");

  const status = await screen.findByRole("status");
  expect(status.textContent).toBe(NEUTRAL);
});

test("asks for a valid email without mentioning the allowlist", async () => {
  vi.mocked(requestMagicLinkAction).mockResolvedValue({ status: "invalid" });
  render(<LoginForm />);

  submit("not-an-email");

  const status = await screen.findByRole("status");
  expect(status).toHaveTextContent("Introduce un correo válido");
  expect(status.textContent).not.toMatch(/permitid|lista|allow/i);
});
