import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserOrNull } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getUserOrNull();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.status !== "FROZEN") return NextResponse.json({ ok: true });

  const { bvnLast4 } = (await req.json().catch(() => ({}))) as { bvnLast4?: string };
  // MOCK identity check: any 4 digits pass. Replace with a real BVN verification provider.
  if (!bvnLast4 || !/^\d{4}$/.test(bvnLast4)) {
    return NextResponse.json({ error: "Enter the last 4 digits of your BVN." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { status: "ACTIVE", lastActiveAt: new Date(), disciplineScore: { increment: 5 } },
    }),
    prisma.schedule.updateMany({
      where: { envelope: { userId: user.id }, status: "PAUSED" },
      data: { status: "ACTIVE" },
    }),
    prisma.heartbeatLog.create({ data: { userId: user.id } }),
  ]);
  return NextResponse.json({ ok: true });
}
