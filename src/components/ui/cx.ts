export type ClassValue = string | false | null | undefined;

/** Joins the truthy class names; the zero-dependency stand-in for clsx. */
export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
