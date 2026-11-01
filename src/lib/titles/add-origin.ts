/** The list the user came from; it decides the initial state of a new title (A1). */
export type AddOrigin = "vistas" | "pendientes";

/**
 * Reads `?desde=` of /anadir. `vistas` adds an already watched title; anything
 * else (pendientes, absent, unknown) adds a pending one.
 */
export function parseAddOrigin(raw: string | string[] | undefined): AddOrigin {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "vistas" ? "vistas" : "pendientes";
}
