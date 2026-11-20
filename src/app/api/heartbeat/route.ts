import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserOrNull } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getUserOrNull();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.status === "FROZEN") return NextResponse.json({ error: "Account is frozen. Unfreeze it first." }, { status: 403 });

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } }),
    prisma.heartbeatLog.create({ data: { userId: user.id } }),
  ]);
  return NextResponse.json({ ok: true });
}
