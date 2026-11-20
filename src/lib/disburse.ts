import "server-only";
import { prisma } from "@/lib/prisma";
import { addFrequency } from "@/lib/time";
import { describeRecipient } from "@/lib/describe";
import { formatNaira } from "@/lib/money";
import { paymentService } from "@/lib/payment/PaymentService";

export type RunOutcome = { ok: true; message: string; reference: string } | { ok: false; message: string };

class Abort extends Error {}

/**
 * The one place a schedule gets paid. The cron job and the "Execute now" button both call this,
 * so what you demo is exactly what runs in production.
 *
 * Safety: the schedule's nextRunAt is claimed first (compare-and-set), so a double tap or a
 * cron/button race can never pay the same slot twice. Money is deducted before the payout is
 * attempted, and put back if the payout fails.
 */
export async function runSchedule(scheduleId: string, opts: { userId?: string; ignoreDue?: boolean } = {}): Promise<RunOutcome> {
  const s = await prisma.schedule.findUnique({ where: { id: scheduleId }, include: { envelope: { include: { user: true } } } });
  if (!s || (opts.userId && s.envelope.userId !== opts.userId)) return { ok: false, message: "Schedule not found." };

  const { envelope } = s;
  const userId = envelope.userId;
  if (envelope.user.status === "FROZEN") return { ok: false, message: "Your account is frozen. Unfreeze it first." };
  if (s.status !== "ACTIVE") return { ok: false, message: s.status === "PAUSED" ? "This schedule is paused. Resume it first." : "This schedule failed earlier. Top up the envelope and resume it." };

  const now = new Date();
  if (!opts.ignoreDue && s.nextRunAt > now) return { ok: false, message: "This schedule is not due yet." };

  const failSchedule = async (reason: string): Promise<RunOutcome> => {
    await prisma.$transaction([
      prisma.schedule.update({ where: { id: s.id }, data: { status: "FAILED", lastError: reason } }),
      prisma.notification.create({
        data: { userId, message: `Release of ${formatNaira(s.amountKobo)} from ${envelope.name} failed: ${reason}` },
      }),
    ]);
    return { ok: false, message: reason };
  };

  if (envelope.balanceKobo < s.amountKobo) return failSchedule("Not enough money in this envelope.");

  // Skip missed slots if the server was down, so one late run doesn't trigger a burst of payouts.
  let next = addFrequency(s.nextRunAt, s.frequency);
  for (let i = 0; i < 400 && next <= now; i++) next = addFrequency(next, s.frequency);

  const recipient = describeRecipient(s);

  // Step 1: claim the slot and take the money out of the envelope (INTERNAL also credits the wallet here).
  try {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.schedule.updateMany({
        where: { id: s.id, status: "ACTIVE", nextRunAt: s.nextRunAt },
        data: { nextRunAt: next, lastError: null },
      });
      if (claim.count === 0) throw new Abort("This release was already processed.");

      const dec = await tx.envelope.updateMany({
        where: { id: envelope.id, balanceKobo: { gte: s.amountKobo } },
        data: { balanceKobo: { decrement: s.amountKobo } },
      });
      if (dec.count === 0) throw new Abort("INSUFFICIENT");

      if (s.recipientType === "INTERNAL") {
        const main = await tx.envelope.findFirst({ where: { userId, type: "FREE" } });
        if (main) await tx.envelope.update({ where: { id: main.id }, data: { balanceKobo: { increment: s.amountKobo } } });
        else await tx.envelope.create({ data: { userId, name: "Main wallet", type: "FREE", balanceKobo: s.amountKobo } });
        await tx.release.create({ data: { envelopeId: envelope.id, amountKobo: s.amountKobo, kind: "SCHEDULED", note: "Moved to available balance" } });
        await tx.user.update({ where: { id: userId }, data: { disciplineScore: { increment: 2 } } });
        await tx.notification.create({ data: { userId, message: `${formatNaira(s.amountKobo)} moved from ${envelope.name} to your available balance.` } });
      }
    });
  } catch (err) {
    if (err instanceof Abort) {
      if (err.message === "INSUFFICIENT") return failSchedule("Not enough money in this envelope.");
      return { ok: false, message: err.message };
    }
    throw err;
  }

  if (s.recipientType === "INTERNAL") {
    return { ok: true, reference: "INTERNAL", message: `${formatNaira(s.amountKobo)} moved to your available balance.` };
  }

  // Step 2: pay out. If the provider declines, put everything back.
  const result = await paymentService
    .disburse({
      recipientType: s.recipientType,
      recipientRef: s.recipientRef,
      bankName: s.bankName,
      bankCode: s.bankCode,
      accountName: s.accountName,
      amountKobo: s.amountKobo,
    })
    .catch((): { ok: false; reference: string; message: string } => ({ ok: false, reference: "", message: "Payment provider is unreachable." }));

  if (!result.ok) {
    await prisma.$transaction([
      prisma.envelope.update({ where: { id: envelope.id }, data: { balanceKobo: { increment: s.amountKobo } } }),
      prisma.schedule.update({ where: { id: s.id }, data: { nextRunAt: s.nextRunAt, status: "FAILED", lastError: result.message ?? "Payment declined." } }),
      prisma.notification.create({
        data: { userId, message: `Release of ${formatNaira(s.amountKobo)} to ${recipient} failed: ${result.message ?? "payment declined"}. Your money is still in ${envelope.name}.` },
      }),
    ]);
    return { ok: false, message: result.message ?? "The payment was declined. Your money is still in the envelope." };
  }

  await prisma.$transaction([
    prisma.release.create({ data: { envelopeId: envelope.id, amountKobo: s.amountKobo, kind: "SCHEDULED", note: result.reference } }),
    prisma.user.update({ where: { id: userId }, data: { disciplineScore: { increment: 2 } } }),
    prisma.notification.create({ data: { userId, message: `${formatNaira(s.amountKobo)} sent to ${recipient} from ${envelope.name}.` } }),
  ]);
  return { ok: true, reference: result.reference, message: `${formatNaira(s.amountKobo)} sent to ${recipient}.` };
}
