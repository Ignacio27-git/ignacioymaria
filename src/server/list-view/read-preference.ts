import "server-only";

import { cookies } from "next/headers";

import {
  LIST_VIEW_COOKIE,
  parseListView,
  type ListView,
} from "@/lib/list-view/preference";

/** The device's stored list view; the table when absent or invalid. */
export async function readListView(): Promise<ListView> {
  const store = await cookies();
  return parseListView(store.get(LIST_VIEW_COOKIE)?.value);
}
