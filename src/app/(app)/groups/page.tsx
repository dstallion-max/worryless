import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import GroupsHub from "@/components/GroupsHub";
import FlashToast from "@/components/FlashToast";

export const dynamic = "force-dynamic";

export default async function GroupsPage({ searchParams }: { searchParams: { error?: string; ok?: string; tab?: string } }) {
  const user = await requireUser();
  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    include: { group: { include: { _count: { select: { members: true } } } } },
    orderBy: { group: { createdAt: "desc" } },
  });

  const groups = memberships.map(({ group, role }) => ({
    id: group.id,
    name: group.name,
    balanceKobo: group.balanceKobo,
    role,
    memberCount: group._count.members,
    rule: (group.rulesJson as { label?: string }).label ?? "Releases need approval",
  }));

  return (
    <main className="px-5 pt-8">
      <FlashToast ok={searchParams.ok} error={searchParams.error} />
      <h1 className="text-2xl font-extrabold tracking-tight">Groups</h1>
      <p className="mt-1 text-sm text-slate-600">Shared pools where money only moves when the group agrees.</p>
      <GroupsHub groups={groups} startOnCreate={searchParams.tab === "create" || groups.length === 0} />
    </main>
  );
}
