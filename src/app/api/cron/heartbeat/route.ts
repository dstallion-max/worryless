import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCronAuthorized } from "@/lib/cron";

export const dynamic = "force-dynamic";

async function run(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cutoff = new Date(Date.now() - 7 * 86_400_000);
  const stale = await prisma.user.findMany({
    where: { status: "ACTIVE", lastActiveAt: { lt: cutoff } },
    select: { id: true },
  });
  const ids = stale.map((u) => u.id);

  if (ids.length > 0) {
    await prisma.$transaction([
      prisma.user.updateMany({ where: { id: { in: ids } }, data: { status: "FROZEN" } }),
      prisma.schedule.updateMany({
        where: { envelope: { userId: { in: ids } }, status: "ACTIVE" },
        data: { status: "PAUSED" },
      }),
      prisma.notification.createMany({
        data: ids.map((userId) => ({
          userId,
          message: "Your account was frozen because you did not confirm in 7 days. Confirm your identity to unfreeze.",
        })),
      }),
    ]);
  }
  return NextResponse.json({ frozen: ids.length });
}

export const GET = run;
export const POST = run;
