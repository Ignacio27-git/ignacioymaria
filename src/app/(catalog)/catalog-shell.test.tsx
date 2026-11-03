import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { CatalogShell } from "./catalog-shell";

const mocks = vi.hoisted(() => ({
  connection: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  getCurrentPerson: vi.fn(),
  readThemePreference: vi.fn(),
  order: [] as string[],
}));

vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth/current-person", () => ({
  getCurrentPerson: mocks.getCurrentPerson,
}));
vi.mock("@/server/theme/read-preference", () => ({
  readThemePreference: mocks.readThemePreference,
}));
vi.mock("./app-header", () => ({
  AppHeader: ({
    themePreference,
    personLabel,
  }: {
    themePreference: string;
    personLabel: string;
  }) => <header>{`Cabecera ${personLabel} ${themePreference}`}</header>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.order.length = 0;
  mocks.connection.mockImplementation(async () => {
    mocks.order.push("connection");
  });
  mocks.getCurrentPerson.mockImplementation(async () => {
    mocks.order.push("person");
    return "maria";
  });
  mocks.readThemePreference.mockResolvedValue("dark");
});

test("renders the header and the page for a signed-in person", async () => {
  render(await CatalogShell({ children: <main>Contenido</main> }));

  expect(screen.getByText("Cabecera María dark")).toBeInTheDocument();
  expect(screen.getByText("Contenido")).toBeInTheDocument();
});

test("waits for the request (connection) before it resolves the person", async () => {
  await CatalogShell({ children: null });

  expect(mocks.order).toEqual(["connection", "person"]);
});

test("a session the database cannot map goes back to /login with no header", async () => {
  mocks.getCurrentPerson.mockResolvedValue(null);

  await expect(CatalogShell({ children: <main>Contenido</main> })).rejects.toThrow(
    "NEXT_REDIRECT",
  );

  expect(mocks.redirect).toHaveBeenCalledWith("/login");
  expect(mocks.readThemePreference).not.toHaveBeenCalled();
});
