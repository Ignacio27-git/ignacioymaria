import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { readThemePreference } from "@/server/theme/read-preference";

import { ThemeSection } from "./theme-section";

vi.mock("@/app/_actions/theme", () => ({ setThemeAction: vi.fn() }));
vi.mock("@/server/theme/read-preference", () => ({
  readThemePreference: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("checks the stored preference in the toggle", async () => {
  vi.mocked(readThemePreference).mockResolvedValue("dark");

  render(await ThemeSection());

  expect(screen.getByRole("group", { name: "Tema" })).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Oscuro" })).toBeChecked();
});

test("checks Sistema when no preference is stored", async () => {
  vi.mocked(readThemePreference).mockResolvedValue("system");

  render(await ThemeSection());

  expect(screen.getByRole("radio", { name: "Sistema" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Oscuro" })).not.toBeChecked();
});
