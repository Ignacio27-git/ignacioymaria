import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { expectNoAxeViolations } from "@/test/axe";

import { TextField } from "./text-field";

test("associates the label with the input", () => {
  render(<TextField label="Correo electrónico" name="email" />);

  const input = screen.getByLabelText("Correo electrónico");
  expect(input).toHaveAttribute("name", "email");
  expect(input.tagName).toBe("INPUT");
});

test("forwards type, autoComplete and other native props to the input", () => {
  render(
    <TextField
      label="Correo electrónico"
      type="email"
      autoComplete="email"
      placeholder="tu@correo.es"
    />,
  );

  const input = screen.getByLabelText("Correo electrónico");
  expect(input).toHaveAttribute("type", "email");
  expect(input).toHaveAttribute("autocomplete", "email");
  expect(input).toHaveAttribute("placeholder", "tu@correo.es");
});

test("links hint and error through aria-describedby", () => {
  render(
    <TextField
      label="Título"
      hint="Como aparece en el cine"
      error="Escribe un título"
    />,
  );

  const input = screen.getByLabelText("Título");
  const describedBy = (input.getAttribute("aria-describedby") ?? "").split(" ");
  expect(describedBy).toHaveLength(2);
  expect(document.getElementById(describedBy[0])).toHaveTextContent(
    "Como aparece en el cine",
  );
  expect(document.getElementById(describedBy[1])).toHaveTextContent(
    "Escribe un título",
  );
  expect(input).toHaveAttribute("aria-invalid", "true");
});

test("the error message is worded as an error, not only coloured", () => {
  render(<TextField label="Nota" error="Introduce una nota entre 0 y 10." />);

  const input = screen.getByLabelText("Nota");
  const message = document.getElementById(
    input.getAttribute("aria-describedby") ?? "",
  );
  expect(message).toHaveTextContent("Error: Introduce una nota entre 0 y 10.");
  expect(input).toHaveAccessibleDescription(
    "Error: Introduce una nota entre 0 y 10.",
  );
});

test("a hint stays free of the error wording", () => {
  render(<TextField label="Nombre" hint="Tal como aparece." />);

  expect(screen.getByLabelText("Nombre")).toHaveAccessibleDescription(
    "Tal como aparece.",
  );
});

test("without hint or error it is valid and has no description", () => {
  render(<TextField label="Título" />);

  const input = screen.getByLabelText("Título");
  expect(input).not.toHaveAttribute("aria-describedby");
  expect(input).not.toHaveAttribute("aria-invalid");
});

test("keeps a caller-provided aria-describedby alongside its own", () => {
  render(
    <>
      <p id="extra">Más ayuda</p>
      <TextField label="Título" hint="Pista" aria-describedby="extra" />
    </>,
  );

  const ids = (
    screen.getByLabelText("Título").getAttribute("aria-describedby") ?? ""
  ).split(" ");
  expect(ids).toContain("extra");
  expect(ids).toHaveLength(2);
});

test("gives each field its own id so labels never cross", () => {
  render(
    <>
      <TextField label="Uno" />
      <TextField label="Dos" />
    </>,
  );

  expect(screen.getByLabelText("Uno").id).not.toBe(
    screen.getByLabelText("Dos").id,
  );
});

test("a search field is a searchbox and hideLabel keeps it named", () => {
  render(<TextField label="Buscar" type="search" hideLabel />);

  const box = screen.getByRole("searchbox", { name: "Buscar" });
  expect(box).toBeInTheDocument();
  expect(screen.getByText("Buscar")).toBeInTheDocument();
});

test("forwards className to the wrapper and a ref to the input", () => {
  let element: HTMLInputElement | null = null;
  render(
    <TextField
      label="Título"
      className="wrapper-extra"
      ref={(node) => {
        element = node;
      }}
    />,
  );

  expect(element).toBe(screen.getByLabelText("Título"));
  expect(screen.getByLabelText("Título").parentElement).toHaveClass(
    "wrapper-extra",
  );
});

test("has no accessibility violations in any state", async () => {
  const { container } = render(
    <>
      <TextField label="Normal" />
      <TextField label="Con ayuda" hint="Pista" />
      <TextField label="Con error" error="Falta" />
      <TextField label="Buscar" type="search" hideLabel />
    </>,
  );

  await expectNoAxeViolations(container);
});
