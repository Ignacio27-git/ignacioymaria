import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { expectNoAxeViolations } from "@/test/axe";

import { AppHeader } from "./app-header";

const pathname = vi.hoisted(() => ({ current: "/vistas" }));

vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));
vi.mock("@/app/_actions/auth", () => ({ signOutAction: vi.fn() }));
vi.mock("@/app/_actions/theme", () => ({ setThemeAction: vi.fn() }));

beforeEach(() => {
  pathname.current = "/vistas";
});

function setup() {
  return render(<AppHeader themePreference="system" personLabel="María" />);
}

test("shows the Vistas and Pendientes tabs in a labelled navigation", () => {
  setup();

  const nav = screen.getByRole("navigation", { name: "Listas" });
  expect(within(nav).getByRole("link", { name: "Vistas" })).toHaveAttribute(
    "href",
    "/vistas",
  );
  expect(within(nav).getByRole("link", { name: "Pendientes" })).toHaveAttribute(
    "href",
    "/pendientes",
  );
});

test("marks the current tab with aria-current=page", () => {
  setup();

  expect(screen.getByRole("link", { name: "Vistas" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("link", { name: "Pendientes" })).not.toHaveAttribute(
    "aria-current",
  );
});

test("Pendientes is current on /pendientes", () => {
  pathname.current = "/pendientes";
  setup();

  expect(screen.getByRole("link", { name: "Pendientes" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("link", { name: "Vistas" })).not.toHaveAttribute(
    "aria-current",
  );
});

test("no tab is current outside the two lists", () => {
  pathname.current = "/titulo/abc";
  setup();

  expect(screen.queryByRole("link", { current: "page" })).toBeNull();
});

// jsdom has no popover support, so the closed menu counts as hidden here.
test("the menu trigger opens a native popover with the theme toggle and sign-out", () => {
  setup();

  const trigger = screen.getByRole("button", { name: "Menú" });
  const menu = document.getElementById(
    trigger.getAttribute("popovertarget") ?? "missing",
  );
  expect(menu).not.toBeNull();
  expect(menu).toHaveAttribute("popover");
  expect(within(menu as HTMLElement).getByRole("group", { name: "Tema", hidden: true })).toBeInTheDocument();
  expect(
    within(menu as HTMLElement).getByRole("button", { name: "Cerrar sesión", hidden: true }),
  ).toHaveAttribute("type", "submit");
});

test("the menu says whose session it is", () => {
  setup();

  expect(screen.getByText("Sesión de María")).toBeInTheDocument();
});

test("Escape closing the popover returns focus to the trigger", () => {
  setup();
  const trigger = screen.getByRole("button", { name: "Menú" });
  const menu = document.getElementById(
    trigger.getAttribute("popovertarget") ?? "missing",
  ) as HTMLElement;
  const radio = within(menu).getAllByRole("radio", { hidden: true })[0];
  radio.focus();

  const closed = Object.assign(new Event("toggle"), {
    newState: "closed",
    oldState: "open",
  });
  menu.dispatchEvent(closed);

  expect(trigger).toHaveFocus();
});

test("closing the popover does not steal focus the user already moved elsewhere", () => {
  render(
    <>
      <input aria-label="Fuera" />
      <AppHeader themePreference="system" personLabel="María" />
    </>,
  );
  const trigger = screen.getByRole("button", { name: "Menú" });
  const menu = document.getElementById(
    trigger.getAttribute("popovertarget") ?? "missing",
  ) as HTMLElement;
  screen.getByLabelText("Fuera").focus();

  menu.dispatchEvent(
    Object.assign(new Event("toggle"), { newState: "closed", oldState: "open" }),
  );

  expect(screen.getByLabelText("Fuera")).toHaveFocus();
});

test("opening the popover leaves focus alone", () => {
  setup();
  const trigger = screen.getByRole("button", { name: "Menú" });
  const menu = document.getElementById(
    trigger.getAttribute("popovertarget") ?? "missing",
  ) as HTMLElement;
  fireEvent.focus(trigger);

  menu.dispatchEvent(
    Object.assign(new Event("toggle"), { newState: "open", oldState: "closed" }),
  );

  expect(trigger).not.toHaveFocus();
});

test("has no accessibility violations", async () => {
  const { container } = setup();

  await expectNoAxeViolations(container);
});
