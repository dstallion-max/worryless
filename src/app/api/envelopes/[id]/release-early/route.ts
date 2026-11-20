import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserOrNull } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUserOrNull();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.status === "FROZEN") return NextResponse.json({ error: "Account is frozen." }, { status: 403 });

  const env = await prisma.envelope.findFirst({ where: { id: params.id, userId: user.id } });
  if (!env) return NextResponse.json({ error: "Envelope not found." }, { status: 404 });
  if (env.type === "FREE" || env.balanceKobo <= 0) {
    return NextResponse.json({ error: "Nothing to release." }, { status: 400 });
  }

  const now = new Date();

  // Cooling-off period (e.g. Emergency envelope): first tap starts the clock, a later tap releases.
  if (env.unlockDelayHours > 0) {
    if (!env.lockedUntil) {
      const until = new Date(now.getTime() + env.unlockDelayHours * 3_600_000);
      await prisma.envelope.update({ where: { id: env.id }, data: { lockedUntil: until } });
      return NextResponse.json({
        message: `Cooling-off started. Tap again after ${until.toLocaleString("en-NG")} to release.`,
      });
    }
    if (env.lockedUntil > now) {
      return NextResponse.json({
        message: `Still locked until ${env.lockedUntil.toLocaleString("en-NG")}.`,
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    const main = await tx.envelope.findFirst({ where: { userId: user.id, type: "FREE" } });
    if (main) {
      await tx.envelope.update({ where: { id: main.id }, data: { balanceKobo: { increment: env.balanceKobo } } });
    } else {
      await tx.envelope.create({
        data: { userId: user.id, name: "Main wallet", type: "FREE", balanceKobo: env.balanceKobo },
      });
    }
    await tx.envelope.update({ where: { id: env.id }, data: { balanceKobo: 0, lockedUntil: null } });
    await tx.release.create({
      data: { envelopeId: env.id, amountKobo: env.balanceKobo, kind: "EARLY", note: "Released early" },
    });
    // Only breaking a LOCKED rule costs you; an Emergency withdrawal after its delay does not.
    if (env.type === "LOCKED") {
      await tx.user.update({ where: { id: user.id }, data: { disciplineScore: 0 } });
    }
  });

  return NextResponse.json({ message: "Released to your available balance." });
}
