import type { WatchDate, WatchState } from "@/domain";

/**
 * What the ficha lets you edit, as the server last confirmed it. The editor
 * owns it so a save in one field can update another (moving to a watched state
 * may also set the date, A2) and the average always comes from the server.
 */
export interface FichaFields {
  state: WatchState;
  watchDate: WatchDate;
  observations: string | null;
  /** The signed-in person's own score. */
  myScore: number | null;
  average: number | null;
}
