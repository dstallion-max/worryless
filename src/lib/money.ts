export const MAX_KOBO = 2_000_000_000; // stays under Postgres Int max

export function formatNaira(kobo: number): string {
  return "₦" + (kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

/** Returns null when the input is not a usable positive amount. */
export function nairaToKobo(value: FormDataEntryValue | number | null): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const kobo = Math.round(n * 100);
  return kobo > 0 && kobo <= MAX_KOBO ? kobo : null;
}
