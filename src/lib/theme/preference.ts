export const THEME_COOKIE = "theme";

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

/** Anything that is not exactly one of the three values means "system". */
export function parseThemePreference(value: unknown): ThemePreference {
  return (THEME_PREFERENCES as readonly unknown[]).includes(value)
    ? (value as ThemePreference)
    : DEFAULT_THEME_PREFERENCE;
}

/** The `data-theme` value for <html>; undefined (omitted) for "system". */
export function themeAttribute(
  preference: ThemePreference,
): "light" | "dark" | undefined {
  return preference === "system" ? undefined : preference;
}
