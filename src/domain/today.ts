const madridDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's calendar day (YYYY-MM-DD) in Europe/Madrid, where the couple lives. */
export function todayIso(now: Date = new Date()): string {
  return madridDay.format(now);
}
