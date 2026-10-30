import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { expectNoAxeViolations } from "@/test/axe";

import { ConfirmDialog } from "./confirm-dialog";

function setup(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const view = render(
    <ConfirmDialog
      open
      title="¿Eliminar este título?"
      description="No se puede deshacer."
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onConfirm, onCancel, ...view };
}

test("is a native modal dialog named by its title", () => {
  setup();

  const dialog = screen.getByRole("dialog", { name: "¿Eliminar este título?" });
  expect(dialog.tagName).toBe("DIALOG");
  expect(dialog).toHaveAttribute("open");
  expect(screen.getByText("No se puede deshacer.")).toBeInTheDocument();
});

test("opens with showModal so focus is trapped and the page is inert", () => {
  const show = vi.spyOn(HTMLDialogElement.prototype, "showModal");
  setup();

  expect(show).toHaveBeenCalledTimes(1);
  show.mockRestore();
});

test("offers Eliminar and Cancelar and wires them", () => {
  const { onConfirm, onCancel } = setup();

  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onConfirm).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

test("labels can be changed", () => {
  setup({ confirmLabel: "Quitar", cancelLabel: "Volver" });

  expect(screen.getByRole("button", { name: "Quitar" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Volver" })).toBeInTheDocument();
});

test("Escape (the native cancel event) cancels and the dialog stays controlled", () => {
  const { onCancel } = setup();
  const dialog = screen.getByRole("dialog");

  const event = new Event("cancel", { cancelable: true });
  act(() => {
    dialog.dispatchEvent(event);
  });

  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(event.defaultPrevented).toBe(true);
});

test("starts on the safe choice: Cancelar has focus", () => {
  setup();

  expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
});

test("closing returns focus to the control that opened it", () => {
  function Harness({ open }: { open: boolean }) {
    return (
      <>
        <button>Abrir</button>
        <ConfirmDialog
          open={open}
          title="¿Eliminar?"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </>
    );
  }
  const { rerender } = render(<Harness open={false} />);
  const opener = screen.getByRole("button", { name: "Abrir" });
  opener.focus();

  rerender(<Harness open />);
  expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();

  rerender(<Harness open={false} />);
  expect(opener).toHaveFocus();
});

test("busy disables both buttons and marks the confirm one", () => {
  setup({ busy: true });

  expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Eliminar" })).toHaveAttribute(
    "aria-busy",
    "true",
  );
});

test("forwards className to the dialog", () => {
  setup({ className: "extra" });

  expect(screen.getByRole("dialog")).toHaveClass("extra");
});

test("has no accessibility violations", async () => {
  const { container } = setup();

  await expectNoAxeViolations(container);
});
