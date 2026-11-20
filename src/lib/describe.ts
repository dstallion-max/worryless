import { formatNaira } from "./money";
import { formatTime, lagosDayOfMonth, lagosWeekday } from "./time";
import { detectNetwork } from "./network";

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export type DescribableSchedule = {
  amountKobo: number;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  nextRunAt: Date;
  recipientType: "AIRTIME" | "BANK" | "INTERNAL";
  recipientRef: string;
  bankName?: string | null;
  accountName?: string | null;
};

export function describeRecipient(s: Pick<DescribableSchedule, "recipientType" | "recipientRef" | "bankName" | "accountName">): string {
  if (s.recipientType === "INTERNAL") return "your available balance";
  if (s.recipientType === "AIRTIME") {
    const net = detectNetwork(s.recipientRef);
    return `${net ? net + " " : "airtime "}${s.recipientRef}`;
  }
  const bank = s.bankName ? `${s.bankName} ` : "";
  const who = s.accountName ? ` (${s.accountName})` : "";
  return `${bank}${s.recipientRef}${who}`;
}

/** e.g. "₦2,000 to MTN 08031234567 every day at 2:00 PM" */
export function describeSchedule(s: DescribableSchedule): string {
  const when =
    s.frequency === "DAILY"
      ? `every day at ${formatTime(s.nextRunAt)}`
      : s.frequency === "WEEKLY"
        ? `every ${lagosWeekday(s.nextRunAt)} at ${formatTime(s.nextRunAt)}`
        : `on the ${ordinal(lagosDayOfMonth(s.nextRunAt))} of every month at ${formatTime(s.nextRunAt)}`;
  return `${formatNaira(s.amountKobo)} to ${describeRecipient(s)} ${when}`;
}
