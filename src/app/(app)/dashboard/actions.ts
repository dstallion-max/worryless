"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

/**
 * Student resumption template: four EMPTY envelopes (Food, Transport, Airtime & data, Emergency).
 * Nothing is pre-filled and no recipients are invented. The user adds money, then sets their own schedules.
 */
export async function seedStudentTemplate() {
  const user = await requireUser();
  if (user.status === "FROZEN") return;

  const existing = await prisma.envelope.count({ where: { userId: user.id, type: { not: "FREE" } } });
  if (existing > 0) return;

  await prisma.envelope.createMany({
    data: [
      { userId: user.id, name: "Food", type: "LOCKED" },
      { userId: user.id, name: "Transport", type: "LOCKED" },
      { userId: user.id, name: "Airtime & data", type: "LOCKED" },
      { userId: user.id, name: "Emergency", type: "EMERGENCY", unlockDelayHours: 24 },
    ],
  });
  revalidatePath("/dashboard");
  revalidatePath("/envelopes");
}
