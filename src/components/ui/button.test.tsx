import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { expectNoAxeViolations } from "@/test/axe";

import { Button } from "./button";

test("renders a native button named by its children", () => {
  render(<Button>Enviar enlace</Button>);

  expect(screen.getByRole("button", { name: "Enviar enlace" })).toBeEnabled();
});

test("defaults to type=button and lets the caller choose submit", () => {
  const { rerender } = render(<Button>Uno</Button>);
  expect(screen.getByRole("button", { name: "Uno" })).toHaveAttribute(
    "type",
    "button",
  );

  rerender(<Button type="submit">Uno</Button>);
  expect(screen.getByRole("button", { name: "Uno" })).toHaveAttribute(
    "type",
    "submit",
  );
});

test("calls onClick when enabled and not when disabled", () => {
  const onClick = vi.fn();
  const { rerender } = render(<Button onClick={onClick}>Pulsar</Button>);

  fireEvent.click(screen.getByRole("button", { name: "Pulsar" }));
  expect(onClick).toHaveBeenCalledTimes(1);

  rerender(
    <Button onClick={onClick} disabled>
      Pulsar
    </Button>,
  );
  const button = screen.getByRole("button", { name: "Pulsar" });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("exposes the pending state through aria-busy", () => {
  render(<Button aria-busy="true">Enviando</Button>);

  expect(screen.getByRole("button", { name: "Enviando" })).toHaveAttribute(
    "aria-busy",
    "true",
  );
});

test("forwards className and native props", () => {
  render(
    <Button className="extra" name="go" data-testid="b">
      Ir
    </Button>,
  );

  const button = screen.getByTestId("b");
  expect(button).toHaveClass("extra");
  expect(button).toHaveAttribute("name", "go");
});

test.each(["primary", "secondary", "ghost"] as const)(
  "the %s variant at both sizes has no accessibility violations",
  async (variant) => {
    const { container } = render(
      <>
        <Button variant={variant}>Medio</Button>
        <Button variant={variant} size="sm">
          Pequeño
        </Button>
        <Button variant={variant} disabled>
          Apagado
        </Button>
      </>,
    );

    expect(screen.getAllByRole("button")).toHaveLength(3);
    await expectNoAxeViolations(container);
  },
);
