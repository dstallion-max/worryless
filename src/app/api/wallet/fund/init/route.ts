import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserOrNull } from "@/lib/auth";
import { MAX_KOBO } from "@/lib/money";

export const dynamic = "force-dynamic";

const MIN_KOBO = 1_000; // ₦10.00

/** Step 1: record the intended payment, return a unique reference for the checkout popup. */
export async function POST(req: Request) {
  const user = await getUserOrNull();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.status === "FROZEN") return NextResponse.json({ error: "Your account is frozen." }, { status: 403 });

  const { amountKobo } = (await req.json().catch(() => ({}))) as { amountKobo?: number };
  if (!Number.isInteger(amountKobo) || amountKobo! < MIN_KOBO || amountKobo! > MAX_KOBO) {
    return NextResponse.json({ error: "Minimum amount is ₦10." }, { status: 400 });
  }

  const txnRef = `MG${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  await prisma.walletFunding.create({ data: { userId: user.id, txnRef, amountKobo: amountKobo! } });
  return NextResponse.json({ txnRef });
}
