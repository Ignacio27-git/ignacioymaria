"use server";

import { cookies } from "next/headers";

import { THEME_COOKIE, THEME_PREFERENCES } from "@/lib/theme/preference";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Stores the device's theme preference. Public on purpose: it only writes the
 * caller's own cookie, and only allowlisted values (invalid input is ignored).
 * "system" removes the cookie so the operating system decides again.
 */
export async function setThemeAction(value: unknown): Promise<void> {
  if (!(THEME_PREFERENCES as readonly unknown[]).includes(value)) return;

  const store = await cookies();
  if (value === "system") {
    store.delete(THEME_COOKIE);
    return;
  }

  store.set(THEME_COOKIE, value as string, {
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
