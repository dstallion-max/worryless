"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { nairaToKobo } from "@/lib/money";
import { runSchedule } from "@/lib/disburse";

/** Move money from the free wallet into a locked envelope. */
export async function allocate(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("envelopeId"));
  const fail = (msg: string) => redirect(`/envelopes/${id}?error=${encodeURIComponent(msg)}`);

  if (user.status === "FROZEN") fail("Your account is frozen.");
  const kobo = nairaToKobo(formData.get("amount"));
  if (!kobo) fail("Enter a valid amount.");

  const env = await prisma.envelope.findFirst({ where: { id, userId: user.id, type: { not: "FREE" } } });
  if (!env) redirect("/envelopes");

  const main = await prisma.envelope.findFirst({ where: { userId: user.id, type: "FREE" } });
  const ok = main
    ? await prisma.$transaction(async (tx) => {
        const dec = await tx.envelope.updateMany({
          where: { id: main.id, balanceKobo: { gte: kobo! } },
          data: { balanceKobo: { decrement: kobo! } },
        });
        if (dec.count === 0) return false;
        await tx.envelope.update({ where: { id }, data: { balanceKobo: { increment: kobo! } } });
        return true;
      })
    : false;

  if (!ok) fail("Not enough available balance. Fund your wallet first.");
  revalidatePath(`/envelopes/${id}`);
  redirect(`/envelopes/${id}`);
}

/* ---------- Create envelope / schedule, run now, pause, delete ---------- */

export type ActionResult = { ok: boolean; message: string };

const MAX_ENVELOPES = 12;
const MAX_SCHEDULES_PER_ENVELOPE = 10;

async function activeUser() {
  const user = await requireUser();
  if (user.status === "FROZEN") return { user: null, error: "Your account is frozen. Unfreeze it first." };
  return { user, error: null };
}

/** Step 1 of the flow: name an envelope and (optionally) fund it from the available balance. */
export async function createEnvelope(input: { name: string; amountNaira: number | null }): Promise<ActionResult> {
  const { user, error } = await activeUser();
  if (!user) return { ok: false, message: error! };

  const name = input.name.trim().slice(0, 30);
  if (name.length < 2) return { ok: false, message: "Give the envelope a name (at least 2 letters)." };

  const kobo = input.amountNaira ? nairaToKobo(input.amountNaira) : 0;
  if (input.amountNaira && !kobo) return { ok: false, message: "Enter a valid amount, or leave it empty." };

  const count = await prisma.envelope.count({ where: { userId: user.id, type: { not: "FREE" } } });
  if (count >= MAX_ENVELOPES) return { ok: false, message: `You can have up to ${MAX_ENVELOPES} envelopes.` };

  const ok = await prisma.$transaction(async (tx) => {
    if (kobo) {
      const dec = await tx.envelope.updateMany({
        where: { userId: user.id, type: "FREE", balanceKobo: { gte: kobo } },
        data: { balanceKobo: { decrement: kobo } },
      });
      if (dec.count === 0) return false;
    }
    await tx.envelope.create({ data: { userId: user.id, name, type: "LOCKED", balanceKobo: kobo ?? 0 } });
    return true;
  });
  if (!ok) return { ok: false, message: "Not enough available balance. Add money to your wallet first." };

  revalidatePath("/envelopes");
  revalidatePath("/dashboard");
  return { ok: true, message: `${name} envelope created.` };
}

export type ScheduleInput = {
  envelopeId: string;
  amountNaira: number;
  recipientType: "AIRTIME" | "BANK" | "INTERNAL";
  phone?: string;
  accountNumber?: string;
  bankCode?: string;
  bankName?: string;
  accountName?: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  startAtIso: string;
};

/** Step 2 of the flow: a rule that pays out of an envelope on a schedule. */
export async function createSchedule(input: ScheduleInput): Promise<ActionResult> {
  const { user, error } = await activeUser();
  if (!user) return { ok: false, message: error! };

  const env = await prisma.envelope.findFirst({
    where: { id: input.envelopeId, userId: user.id, type: { not: "FREE" } },
    include: { _count: { select: { schedules: true } } },
  });
  if (!env) return { ok: false, message: "Envelope not found." };
  if (env._count.schedules >= MAX_SCHEDULES_PER_ENVELOPE) return { ok: false, message: "This envelope already has the maximum number of schedules." };

  const amountKobo = nairaToKobo(input.amountNaira);
  if (!amountKobo) return { ok: false, message: "Enter a valid amount." };

  if (!["DAILY", "WEEKLY", "MONTHLY"].includes(input.frequency)) return { ok: false, message: "Choose how often it should run." };

  const startAt = new Date(input.startAtIso);
  if (Number.isNaN(startAt.getTime())) return { ok: false, message: "Pick a start date and time." };
  if (startAt.getTime() < Date.now() - 5 * 60_000) return { ok: false, message: "That time has already passed. Pick a time from now on." };

  let recipientRef = "wallet";
  let bankName: string | null = null;
  let bankCode: string | null = null;
  let accountName: string | null = null;

  if (input.recipientType === "AIRTIME") {
    const phone = (input.phone ?? "").replace(/\s/g, "");
    if (!/^0\d{10}$/.test(phone)) return { ok: false, message: "Enter an 11-digit phone number starting with 0." };
    recipientRef = phone;
  } else if (input.recipientType === "BANK") {
    const acct = (input.accountNumber ?? "").replace(/\s/g, "");
    if (!/^\d{10}$/.test(acct)) return { ok: false, message: "Enter the 10-digit account number." };
    if (!input.bankName || !input.bankCode) return { ok: false, message: "Choose the bank." };
    recipientRef = acct;
    bankName = input.bankName.slice(0, 60);
    bankCode = input.bankCode.slice(0, 10);
    accountName = input.accountName?.trim().slice(0, 60) || null;
  } else if (input.recipientType !== "INTERNAL") {
    return { ok: false, message: "Choose who gets the money." };
  }

  await prisma.schedule.create({
    data: {
      envelopeId: env.id,
      amountKobo,
      frequency: input.frequency,
      nextRunAt: startAt,
      recipientType: input.recipientType,
      recipientRef,
      bankName,
      bankCode,
      accountName,
    },
  });
  revalidatePath(`/envelopes/${env.id}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Schedule created." };
}

/** "Execute now": runs the exact same engine as the cron job, for one schedule. */
export async function executeScheduleNow(scheduleId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runSchedule(scheduleId, { userId: user.id, ignoreDue: true });
  revalidatePath("/envelopes", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return { ok: result.ok, message: result.message };
}

export async function setScheduleStatus(scheduleId: string, status: "ACTIVE" | "PAUSED"): Promise<ActionResult> {
  const { user, error } = await activeUser();
  if (!user) return { ok: false, message: error! };
  const s = await prisma.schedule.findFirst({ where: { id: scheduleId, envelope: { userId: user.id } } });
  if (!s) return { ok: false, message: "Schedule not found." };
  await prisma.schedule.update({ where: { id: s.id }, data: { status, lastError: null } });
  revalidatePath(`/envelopes/${s.envelopeId}`);
  return { ok: true, message: status === "ACTIVE" ? "Schedule resumed." : "Schedule paused." };
}

export async function deleteSchedule(scheduleId: string): Promise<ActionResult> {
  const { user, error } = await activeUser();
  if (!user) return { ok: false, message: error! };
  const s = await prisma.schedule.findFirst({ where: { id: scheduleId, envelope: { userId: user.id } } });
  if (!s) return { ok: false, message: "Schedule not found." };
  await prisma.schedule.delete({ where: { id: s.id } });
  revalidatePath(`/envelopes/${s.envelopeId}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Schedule deleted." };
}
