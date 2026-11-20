import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserOrNull } from "@/lib/auth";
import { runSchedule } from "@/lib/disburse";

export const dynamic = "force-dynamic";

/**
 * "Lazy cron": when the signed-in user opens the app, catch up on their own overdue schedules.
 * Only this user's schedules are touched. runSchedule claims each slot atomically, so calling
 * this twice (or alongside the real cron job) can never pay the same release twice.
 */
export async function POST() {
  const user = await getUserOrNull();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.status === "FROZEN") return NextResponse.json({ due: 0, paid: 0, failed: 0, messages: [] });

  const due = await prisma.schedule.findMany({
    where: { status: "ACTIVE", nextRunAt: { lte: new Date() }, envelope: { userId: user.id } },
    select: { id: true },
    orderBy: { nextRunAt: "asc" },
    take: 25,
  });

  let paid = 0;
  let failed = 0;
  const messages: string[] = [];
  for (const { id } of due) {
    const result = await runSchedule(id, { userId: user.id });
    if (result.ok) paid++;
    else failed++;
    messages.push(result.message);
  }
  return NextResponse.json({ due: due.length, paid, failed, messages });
}
