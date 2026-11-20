const PREFIXES: Record<string, string[]> = {
  MTN: ["0803", "0806", "0703", "0706", "0813", "0816", "0810", "0814", "0903", "0906", "0913", "0916", "0704"],
  Airtel: ["0802", "0808", "0708", "0812", "0701", "0902", "0907", "0901", "0904", "0912"],
  Glo: ["0805", "0807", "0705", "0815", "0811", "0905", "0915"],
  "9mobile": ["0809", "0818", "0817", "0909", "0908"],
};

/** Best-effort network name from a Nigerian phone number. Returns null when unknown. */
export function detectNetwork(phone: string): string | null {
  const prefix = phone.slice(0, 4);
  for (const [name, list] of Object.entries(PREFIXES)) if (list.includes(prefix)) return name;
  return null;
}
