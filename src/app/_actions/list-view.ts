"use server";

import { cookies } from "next/headers";

import { LIST_VIEW_COOKIE, LIST_VIEWS } from "@/lib/list-view/preference";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Stores the device's list view (table or card grid). Public on purpose: it
 * only writes the caller's own cookie, and only allowlisted values (invalid
 * input is ignored). The table is stored too, not deleted: one branch fewer.
 */
export async function setListViewAction(value: unknown): Promise<void> {
  if (!(LIST_VIEWS as readonly unknown[]).includes(value)) return;

  const store = await cookies();
  store.set(LIST_VIEW_COOKIE, value as string, {
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
