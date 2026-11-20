"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatNaira, nairaToKobo } from "@/lib/money";

type Vote = { userId: string; vote: "APPROVE" | "REJECT" };
class Abort extends Error {}

/** Redirects back to the group with a message that the page shows as a toast. */
const back = (groupId: string, error?: string, ok?: string): never => {
  const q = error ? `?error=${encodeURIComponent(error)}` : ok ? `?ok=${encodeURIComponent(ok)}` : "";
  redirect(`/groups/${groupId}${q}`);
};

async function membership(groupId: string, userId: string) {
  const m = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (!m) redirect("/groups");
  return m;
}

/** Returns an error message for invalid input, otherwise redirects to the new group. */
export async function createGroup(formData: FormData): Promise<{ error: string } | void> {
  const user = await requireUser();
  if (user.status === "FROZEN") return { error: "Your account is frozen." };

  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const purpose = String(formData.get("purpose") ?? "").trim().slice(0, 30) || "Money";
  const required = Math.max(1, Math.min(10, Number(formData.get("required")) || 2));
  if (name.length < 2) return { error: "Give the group a name (at least 2 letters)." };

  const count = await prisma.groupMember.count({ where: { userId: user.id } });
  if (count >= 20) return { error: "You are already in 20 groups." };

  const group = await prisma.group.create({
    data: {
      name,
      createdBy: user.id,
      rulesJson: {
        requiredApprovals: required,
        label: `${purpose} release requires ${required} ${required === 1 ? "approval" : "approvals"}`,
      },
      members: { create: { userId: user.id, role: "ADMIN" } },
    },
  });
  redirect(`/groups/${group.id}?ok=${encodeURIComponent("Group created. Invite your people next.")}`);
}

export async function inviteMember(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId"));
  const m = await membership(groupId, user.id);
  if (m.role !== "ADMIN") back(groupId, "Only the group admin can invite people.");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const invitee = await prisma.user.findUnique({ where: { email } });
  if (!invitee) back(groupId, "That person has not created a Worryless account yet. Ask them to sign up first.");
  if (invitee!.id === user.id) back(groupId, "You are already in this group.");

  const group = await prisma.group.findUniqueOrThrow({ where: { id: groupId }, select: { name: true } });
  const existing = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: invitee!.id } } });
  if (existing) back(groupId, `${invitee!.name ?? email} is already in this group.`);

  await prisma.$transaction([
    prisma.groupMember.create({ data: { groupId, userId: invitee!.id } }),
    prisma.notification.create({ data: { userId: invitee!.id, message: `${user.name ?? "Someone"} added you to the group "${group.name}".` } }),
  ]);
  revalidatePath(`/groups/${groupId}`);
  back(groupId, undefined, `${invitee!.name ?? email} added to the group.`);
}

export async function contribute(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId"));
  await membership(groupId, user.id);
  if (user.status === "FROZEN") back(groupId, "Your account is frozen.");

  const kobo = nairaToKobo(formData.get("amount"));
  if (!kobo) back(groupId, "Enter a valid amount.");

  const main = await prisma.envelope.findFirst({ where: { userId: user.id, type: "FREE" } });
  const ok = main
    ? await prisma.$transaction(async (tx) => {
        const dec = await tx.envelope.updateMany({
          where: { id: main.id, balanceKobo: { gte: kobo! } },
          data: { balanceKobo: { decrement: kobo! } },
        });
        if (dec.count === 0) return false;
        await tx.group.update({ where: { id: groupId }, data: { balanceKobo: { increment: kobo! } } });
        await tx.contribution.create({ data: { groupId, userId: user.id, amountKobo: kobo! } });
        return true;
      })
    : false;

  if (!ok) back(groupId, "Not enough available balance. Add money to your wallet first.");
  revalidatePath(`/groups/${groupId}`);
  back(groupId, undefined, `${formatNaira(kobo!)} added to the group pool.`);
}

export async function requestRelease(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId"));
  await membership(groupId, user.id);
  if (user.status === "FROZEN") back(groupId, "Your account is frozen.");

  const kobo = nairaToKobo(formData.get("amount"));
  const purpose = String(formData.get("purpose") ?? "").trim().slice(0, 60);
  if (!kobo || !purpose) back(groupId, "Enter an amount and a purpose.");

  const group = await prisma.group.findUniqueOrThrow({ where: { id: groupId } });
  if (kobo! > group.balanceKobo) back(groupId, `The pool only has ${formatNaira(group.balanceKobo)}. Ask for less, or add money first.`);

  const rules = group.rulesJson as { requiredApprovals?: number };
  await prisma.approval.create({
    data: { groupId, amountKobo: kobo!, purpose, requiredApprovals: rules.requiredApprovals ?? 2, createdBy: user.id },
  });
  revalidatePath(`/groups/${groupId}`);
  back(groupId, undefined, "Request sent. The group can vote on it now.");
}

export async function castVote(formData: FormData) {
  const user = await requireUser();
  const approvalId = String(formData.get("approvalId"));
  const choice = formData.get("vote") === "APPROVE" ? "APPROVE" : "REJECT";

  const approval = await prisma.approval.findUnique({ where: { id: approvalId } });
  if (!approval) redirect("/groups");
  const a = approval!;
  const groupId = a.groupId;
  await membership(groupId, user.id);
  if (user.status === "FROZEN") back(groupId, "Your account is frozen.");

  if (a.status !== "PENDING") back(groupId, "This request is already closed.");
  const votes = (a.approvalsJson as unknown as Vote[]) ?? [];
  if (votes.some((v) => v.userId === user.id)) back(groupId, "You already voted on this request.");

  votes.push({ userId: user.id, vote: choice });
  const approvals = votes.filter((v) => v.vote === "APPROVE").length;
  const rejects = votes.filter((v) => v.vote === "REJECT").length;
  const memberCount = await prisma.groupMember.count({ where: { groupId } });
  const json = votes as unknown as Prisma.InputJsonValue;
  const money = formatNaira(a.amountKobo);

  if (approvals >= a.requiredApprovals) {
    // Enough approvals: the pool pays the requester's available balance. All or nothing.
    try {
      await prisma.$transaction(async (tx) => {
        const flip = await tx.approval.updateMany({ where: { id: a.id, status: "PENDING" }, data: { status: "APPROVED", approvalsJson: json } });
        if (flip.count === 0) throw new Abort("This request is already closed.");

        const dec = await tx.group.updateMany({ where: { id: groupId, balanceKobo: { gte: a.amountKobo } }, data: { balanceKobo: { decrement: a.amountKobo } } });
        if (dec.count === 0) throw new Abort("The pool no longer has enough money for this release. Add money to the pool, then vote again.");

        const wallet = await tx.envelope.findFirst({ where: { userId: a.createdBy, type: "FREE" } });
        if (wallet) await tx.envelope.update({ where: { id: wallet.id }, data: { balanceKobo: { increment: a.amountKobo } } });
        else await tx.envelope.create({ data: { userId: a.createdBy, name: "Main wallet", type: "FREE", balanceKobo: a.amountKobo } });

        await tx.notification.create({ data: { userId: a.createdBy, message: `${money} for ${a.purpose} was approved and added to your available balance.` } });
      });
    } catch (err) {
      if (err instanceof Abort) back(groupId, err.message);
      throw err;
    }
    revalidatePath(`/groups/${groupId}`);
    back(groupId, undefined, `Approved. ${money} released to the requester.`);
  }

  if (memberCount - rejects < a.requiredApprovals) {
    // Too many declines: it can no longer reach the approvals it needs.
    await prisma.$transaction([
      prisma.approval.update({ where: { id: a.id }, data: { status: "REJECTED", approvalsJson: json } }),
      prisma.notification.create({ data: { userId: a.createdBy, message: `Your request for ${money} (${a.purpose}) was declined by the group.` } }),
    ]);
    revalidatePath(`/groups/${groupId}`);
    back(groupId, undefined, "Request declined.");
  }

  await prisma.approval.update({ where: { id: a.id }, data: { approvalsJson: json } });
  revalidatePath(`/groups/${groupId}`);
  back(groupId, undefined, choice === "APPROVE" ? "Vote recorded. Waiting for the others." : "Decline recorded.");
}
