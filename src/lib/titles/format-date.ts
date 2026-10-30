const SHORT_DATE: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

const watchFormat = new Intl.DateTimeFormat("es-ES", {
  ...SHORT_DATE,
  timeZone: "UTC",
});
const addedFormat = new Intl.DateTimeFormat("es-ES", {
  ...SHORT_DATE,
  timeZone: "Europe/Madrid",
});

// es-ES prints "1 may 2026" or "1 may. 2026" depending on the ICU build.
function tidy(text: string): string {
  return text.replace(/\./g, "").replace(/\s+de\s+/g, " ");
}

/** A calendar day ("2026-05-01") as "1 may 2026"; the day never shifts with the zone. */
export function formatWatchDate(isoDay: string): string {
  const date = new Date(`${isoDay}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "—" : tidy(watchFormat.format(date));
}

/** A creation timestamp as its Madrid calendar day, "31 oct 2026". */
export function formatAddedDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  return Number.isNaN(date.getTime()) ? "—" : tidy(addedFormat.format(date));
}
