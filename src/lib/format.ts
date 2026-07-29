/**
 * Fixed to UTC so the server and the browser render byte-identical strings and
 * React never reports a hydration mismatch on a date.
 */
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  return DATE_FORMAT.format(date);
}

const NUMBER_FORMAT = new Intl.NumberFormat("en-GB");

export function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(value);
}

/** "example.com/thing" — a link label that does not shout its protocol. */
export function prettyUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
    return `${parsed.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return url;
  }
}
