import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCronAuthorized } from "@/lib/cron";
import { runSchedule } from "@/lib/disburse";

export const dynamic = "force-dynamic";

async function run(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const due = await prisma.schedule.findMany({
    where: { status: "ACTIVE", nextRunAt: { lte: new Date() }, envelope: { user: { status: "ACTIVE" } } },
    select: { id: true },
    take: 200,
  });

  let paid = 0;
  let failed = 0;
  for (const { id } of due) {
    const result = await runSchedule(id);
    if (result.ok) paid++;
    else failed++;
  }
  return NextResponse.json({ due: due.length, paid, failed });
}

export const GET = run;
export const POST = run;
