import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserOrNull } from "@/lib/auth";
import { MAX_KOBO, formatNaira } from "@/lib/money";
import { paymentService } from "@/lib/payment/PaymentService";

export const dynamic = "force-dynamic";

/** Quick actions: buy airtime or send to a bank account from the available balance (payouts are mocked). */
export async function POST(req: Request) {
  const user = await getUserOrNull();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.status === "FROZEN") return NextResponse.json({ error: "Your account is frozen." }, { status: 403 });

  const { kind, recipient, amountKobo } = (await req.json().catch(() => ({}))) as {
    kind?: "AIRTIME" | "SEND";
    recipient?: string;
    amountKobo?: number;
  };

  if (!Number.isInteger(amountKobo) || amountKobo! < 1_000 || amountKobo! > MAX_KOBO) {
    return NextResponse.json({ error: "Enter an amount of at least ₦10." }, { status: 400 });
  }
  if (kind === "AIRTIME" && !/^0\d{10}$/.test(recipient ?? "")) {
    return NextResponse.json({ error: "Enter an 11-digit phone number, e.g. 08012345678." }, { status: 400 });
  }
  if (kind === "SEND" && !/^\d{10}$/.test(recipient ?? "")) {
    return NextResponse.json({ error: "Enter a 10-digit account number." }, { status: 400 });
  }
  if (kind !== "AIRTIME" && kind !== "SEND") return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  const main = await prisma.envelope.findFirst({ where: { userId: user.id, type: "FREE" } });
  const debited = main
    ? await prisma.envelope.updateMany({
        where: { id: main.id, balanceKobo: { gte: amountKobo! } },
        data: { balanceKobo: { decrement: amountKobo! } },
      })
    : { count: 0 };
  if (debited.count === 0) {
    return NextResponse.json({ error: "Not enough available balance." }, { status: 400 });
  }

  const result =
    kind === "AIRTIME"
      ? await paymentService.buyAirtime({ phone: recipient!, amountKobo: amountKobo! })
      : await paymentService.disburseToBank({ accountRef: recipient!, amountKobo: amountKobo! });

  if (!result.ok) {
    await prisma.envelope.update({ where: { id: main!.id }, data: { balanceKobo: { increment: amountKobo! } } });
    return NextResponse.json({ error: result.message ?? "The payment could not be sent." }, { status: 502 });
  }

  await prisma.notification.create({
    data: {
      userId: user.id,
      message:
        kind === "AIRTIME"
          ? `${formatNaira(amountKobo!)} airtime sent to ${recipient}.`
          : `${formatNaira(amountKobo!)} sent to account ${recipient}.`,
    },
  });
  return NextResponse.json({ ok: true });
}
