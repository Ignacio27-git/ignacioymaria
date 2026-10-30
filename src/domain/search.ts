/**
 * Lowercase, accent-free form of a string. Mirrors the SQL function
 * public.fold_search (NFD, drop combining marks, lowercase) so a query folded
 * here matches the generated titles.name_search column.
 */
export function foldSearch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Escapes LIKE/ILIKE wildcards so user text is matched literally. */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, "\\$&");
}
