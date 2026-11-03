import "server-only";

import { cookies } from "next/headers";

import {
  parseThemePreference,
  THEME_COOKIE,
  type ThemePreference,
} from "@/lib/theme/preference";

/** The device's stored theme preference; "system" when absent or invalid. */
export async function readThemePreference(): Promise<ThemePreference> {
  const store = await cookies();
  return parseThemePreference(store.get(THEME_COOKIE)?.value);
}
