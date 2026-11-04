export const LIST_VIEW_COOKIE = "list_view";

export const LIST_VIEWS = ["table", "grid"] as const;
export type ListView = (typeof LIST_VIEWS)[number];

export const DEFAULT_LIST_VIEW: ListView = "table";

/** Anything that is not exactly one of the allowlisted values means the table. */
export function parseListView(value: unknown): ListView {
  return (LIST_VIEWS as readonly unknown[]).includes(value)
    ? (value as ListView)
    : DEFAULT_LIST_VIEW;
}
