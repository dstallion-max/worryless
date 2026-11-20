import Link from "next/link";
import { Lock, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import AutoRunSchedules from "@/components/AutoRunSchedules";
import { formatNaira } from "@/lib/money";
import CreateEnvelopeButton from "@/components/CreateEnvelopeButton";
import { seedStudentTemplate } from "../dashboard/actions";

export const dynamic = "force-dynamic";

export default async function EnvelopesPage() {
  const user = await requireUser();
  const envelopes = await prisma.envelope.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  const freeKobo = envelopes.filter((e) => e.type === "FREE").reduce((sum, e) => sum + e.balanceKobo, 0);
  const hasLocked = envelopes.some((e) => e.type !== "FREE");

  return (
    <main className="px-5 pt-8">
      <AutoRunSchedules />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Envelopes</h1>
        {user.status === "ACTIVE" && <CreateEnvelopeButton freeKobo={freeKobo} />}
      </div>
      <p className="mt-1 text-sm text-slate-600">Available to put in an envelope: {formatNaira(freeKobo)}</p>

      <ul className="mt-5 space-y-3">
        {envelopes.map((e) => (
          <li key={e.id}>
            <Link href={`/envelopes/${e.id}`} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
              <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${e.type === "FREE" ? "bg-free-500" : "bg-locked-800"}`}>
                {e.type === "FREE" ? <Wallet size={22} /> : <Lock size={22} />}
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{e.name}</span>
                <span className="text-xs text-slate-500">{e.type === "FREE" ? "Free to spend" : e.type === "EMERGENCY" ? "Emergency, cooling-off before release" : "Locked"}</span>
              </span>
              <span className="font-bold">{formatNaira(e.balanceKobo)}</span>
            </Link>
          </li>
        ))}
      </ul>

      {!hasLocked && (
        <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">Start with a template</h2>
          <p className="mt-1 text-sm text-slate-600">
            Food, Transport, Airtime &amp; data and Emergency, all empty. Or tap Add envelope to make your own.
          </p>
          <form action={seedStudentTemplate} className="mt-4">
            <button className="w-full rounded-2xl bg-brand-700 py-3.5 font-semibold text-white">Use student template</button>
          </form>
        </div>
      )}
    </main>
  );
}
