import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserOrNull } from "@/lib/auth";
import { formatNaira } from "@/lib/money";
import { paymentService } from "@/lib/payment/PaymentService";

export const dynamic = "force-dynamic";

/**
 * Step 2: after the popup reports success, ask Interswitch directly. The browser's word is never
 * enough to credit money. The PENDING -> SUCCESS flip is atomic, so a payment can only credit once.
 */
export async function POST(req: Request) {
  const user = await getUserOrNull();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { txnRef } = (await req.json().catch(() => ({}))) as { txnRef?: string };
  const funding = txnRef ? await prisma.walletFunding.findFirst({ where: { txnRef, userId: user.id } }) : null;
  if (!funding) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (funding.status === "SUCCESS") return NextResponse.json({ status: "SUCCESS" });

  const check = await paymentService.verifyFunding({ txnRef: funding.txnRef, amountKobo: funding.amountKobo });
  if (check.status === "UNREACHABLE") {
    return NextResponse.json({ status: "PENDING", message: check.message }, { status: 202 });
  }
  if (check.status === "FAILED") {
    return NextResponse.json({ status: "FAILED", message: check.message });
  }

  await prisma.$transaction(async (tx) => {
    const flip = await tx.walletFunding.updateMany({
      where: { id: funding.id, status: "PENDING" },
      data: { status: "SUCCESS", verifiedAt: new Date() },
    });
    if (flip.count === 0) return; // already credited by a parallel request

    const main = await tx.envelope.findFirst({ where: { userId: user.id, type: "FREE" } });
    if (main) {
      await tx.envelope.update({ where: { id: main.id }, data: { balanceKobo: { increment: funding.amountKobo } } });
    } else {
      await tx.envelope.create({
        data: { userId: user.id, name: "Main wallet", type: "FREE", balanceKobo: funding.amountKobo },
      });
    }
    await tx.notification.create({
      data: { userId: user.id, message: `${formatNaira(funding.amountKobo)} was added to your wallet.` },
    });
  });

  return NextResponse.json({ status: "SUCCESS" });
}
