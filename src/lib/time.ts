const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function timeAgo(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < MIN) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MIN)} min ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} h ago`;
  const d = Math.floor(diff / DAY);
  return d === 1 ? "1 day ago" : `${d} days ago`;
}

export function timeUntil(date: Date | string): string {
  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return "now";
  if (diff < HOUR) return `${Math.ceil(diff / MIN)} min`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} h`;
  const d = Math.floor(diff / DAY);
  const h = Math.floor((diff % DAY) / HOUR);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export type Freq = "DAILY" | "WEEKLY" | "MONTHLY";

export function addFrequency(from: Date, frequency: Freq): Date {
  const next = new Date(from);
  if (frequency === "DAILY") next.setUTCDate(next.getUTCDate() + 1);
  else if (frequency === "WEEKLY") next.setUTCDate(next.getUTCDate() + 7);
  else next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

const LAGOS = "Africa/Lagos";

/** "2:00 PM" in Nigerian time, whatever timezone the server runs in. */
export function formatTime(date: Date | string): string {
  return new Date(date)
    .toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: LAGOS })
    .toUpperCase();
}

/** "Fri, 20 Nov, 2:00 PM" */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  const day = d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", timeZone: LAGOS });
  return `${day}, ${formatTime(d)}`;
}

export function lagosWeekday(date: Date): string {
  return date.toLocaleDateString("en-NG", { weekday: "long", timeZone: LAGOS });
}

export function lagosDayOfMonth(date: Date): number {
  return parseInt(date.toLocaleDateString("en-GB", { day: "numeric", timeZone: LAGOS }), 10);
}
