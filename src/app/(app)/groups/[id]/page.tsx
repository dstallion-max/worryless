import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Lock, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatNaira } from "@/lib/money";
import { timeAgo } from "@/lib/time";
import GroupActions from "@/components/GroupActions";
import VoteButtons from "@/components/VoteButtons";
import FlashToast from "@/components/FlashToast";

export const dynamic = "force-dynamic";

type Vote = { userId: string; vote: "APPROVE" | "REJECT" };

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; ok?: string };
}) {
  const user = await requireUser();
  const me = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId: params.id, userId: user.id } } });
  if (!me) notFound();

  const [group, totals, wallet] = await Promise.all([
    prisma.group.findUniqueOrThrow({
      where: { id: params.id },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { role: "asc" } },
        approvals: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    }),
    prisma.contribution.groupBy({ by: ["userId"], where: { groupId: params.id }, _sum: { amountKobo: true } }),
    prisma.envelope.findFirst({ where: { userId: user.id, type: "FREE" }, select: { balanceKobo: true } }),
  ]);

  const contributed = new Map(totals.map((t) => [t.userId, t._sum.amountKobo ?? 0]));
  const names = new Map(group.members.map((m) => [m.userId, m.user.name ?? m.user.email]));
  const rules = group.rulesJson as { label?: string };
  const pending = group.approvals.filter((a) => a.status === "PENDING");
  const closed = group.approvals.filter((a) => a.status !== "PENDING");
  const frozen = user.status === "FROZEN";

  return (
    <main className="px-5 pt-6">
      <FlashToast ok={searchParams.ok} error={searchParams.error} />
      <Link href="/groups" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600">
        <ChevronLeft size={18} /> Groups
      </Link>

      <section className="mt-4 rounded-3xl bg-gradient-to-br from-brand-600 to-brand-900 p-6 text-white shadow-md">
        <p className="text-sm text-brand-100">{group.name}</p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight">{formatNaira(group.balanceKobo)}</p>
        <p className="mt-0.5 text-xs text-brand-100">in the pool</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm backdrop-blur">
          <ShieldCheck size={14} /> {rules.label ?? "Releases need approval"}
        </div>
      </section>

      <GroupActions groupId={group.id} isAdmin={me.role === "ADMIN"} freeKobo={wallet?.balanceKobo ?? 0} disabled={frozen} />

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Pending approvals</h2>
        {pending.length === 0 && <p className="rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">Nothing waiting for a vote.</p>}
        <ul className="space-y-3">
          {pending.map((a) => {
            const votes = (a.approvalsJson as unknown as Vote[]) ?? [];
            const approved = votes.filter((v) => v.vote === "APPROVE").length;
            const voted = votes.some((v) => v.userId === user.id);
            return (
              <li key={a.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-lg font-bold">{formatNaira(a.amountKobo)}</p>
                <p className="text-sm text-slate-700">for {a.purpose}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Asked by {names.get(a.createdBy) ?? "a member"} · <span suppressHydrationWarning>{timeAgo(a.createdAt)}</span>
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100" aria-hidden>
                  <div className="h-full rounded-full bg-free-500" style={{ width: `${Math.min(100, (approved / a.requiredApprovals) * 100)}%` }} />
                </div>
                <p className="mt-1.5 text-sm font-medium text-slate-700">
                  {approved} of {a.requiredApprovals} approved
                </p>
                {voted ? <p className="mt-3 text-sm text-slate-500">You have voted. Waiting for the others.</p> : <VoteButtons approvalId={a.id} disabled={frozen} />}
              </li>
            );
          })}
        </ul>
        {closed.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-sm text-slate-500">
            {closed.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${a.status === "APPROVED" ? "bg-free-500" : "bg-frozen-500"}`} />
                {a.status === "APPROVED" ? "Released" : "Declined"}: {formatNaira(a.amountKobo)} for {a.purpose}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Members</h2>
        <ul className="divide-y divide-gray-100 rounded-2xl bg-white shadow-sm">
          {group.members.map((m) => {
            const paid = contributed.get(m.userId) ?? 0;
            const name = m.user.name ?? m.user.email;
            return (
              <li key={m.userId} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{name.slice(0, 2).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {name}
                    {m.userId === user.id && " (you)"}
                  </span>
                  <span className="text-xs text-slate-500">{m.role === "ADMIN" ? "Admin" : "Member"}</span>
                </span>
                {paid > 0 ? (
                  <span className="text-right">
                    <span className="block text-sm font-bold">{formatNaira(paid)}</span>
                    <span className="text-xs font-medium text-free-700">Contributed</span>
                  </span>
                ) : (
                  <span className="rounded-full bg-warn-50 px-2.5 py-1 text-xs font-semibold text-warn-700">Not yet</span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
          <Lock size={12} /> Money only leaves the pool when enough members approve.
        </p>
      </section>
    </main>
  );
}
