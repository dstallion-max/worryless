import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatNaira } from "@/lib/money";
import { formatDate, formatDateTime, addFrequency, timeUntil } from "@/lib/time";
import { describeSchedule } from "@/lib/describe";
import ReleaseEarlyButton from "@/components/ReleaseEarlyButton";
import CreateScheduleButton from "@/components/CreateScheduleButton";
import ScheduleList from "@/components/ScheduleList";
import { allocate } from "../actions";

export const dynamic = "force-dynamic";

export default async function EnvelopePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const user = await requireUser();
  const envelope = await prisma.envelope.findFirst({
    where: { id: params.id, userId: user.id },
    include: { schedules: true, releases: { orderBy: { createdAt: "desc" }, take: 10 } },
  });
  if (!envelope) notFound();

  const active = envelope.schedules.filter((s) => s.status === "ACTIVE");
  const planned = active
    .flatMap((s) => {
      const runs: { at: Date; amountKobo: number }[] = [];
      let at = s.nextRunAt;
      for (let i = 0; i < 3; i++) {
        runs.push({ at, amountKobo: s.amountKobo });
        at = addFrequency(at, s.frequency);
      }
      return runs;
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, 3);

  const isFree = envelope.type === "FREE";
  const canRelease = !isFree && envelope.balanceKobo > 0 && user.status === "ACTIVE";

  return (
    <main className="px-5 pt-6">
      <Link href="/envelopes" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600">
        <ChevronLeft size={18} /> Envelopes
      </Link>

      <section className={`mt-4 rounded-3xl p-6 text-white shadow-md ${isFree ? "bg-free-500" : "bg-locked-800"}`}>
        <p className="text-sm opacity-80">{envelope.name}</p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight">{formatNaira(envelope.balanceKobo)}</p>
      </section>

      <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">Schedules</p>
        {envelope.schedules.length > 0 ? (
          <div className="mt-3">
            <ScheduleList
              disabled={user.status !== "ACTIVE"}
              rows={envelope.schedules.map((sch) => ({
                id: sch.id,
                description: describeSchedule(sch),
                nextLabel: formatDateTime(sch.nextRunAt),
                status: sch.status,
                lastError: sch.lastError,
              }))}
            />
          </div>
        ) : envelope.unlockDelayHours > 0 ? (
          <p className="mt-1 font-medium">
            No automatic release. Money unlocks {envelope.unlockDelayHours} hours after you ask for it.
            {envelope.lockedUntil && envelope.lockedUntil > new Date() && ` Unlocks in ${timeUntil(envelope.lockedUntil)}.`}
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-600">No schedule yet. Create one to pay airtime, a bank account, or your own balance on a set time.</p>
        )}
        {!isFree && user.status === "ACTIVE" && (
          <div className="mt-4">
            <CreateScheduleButton envelopeId={envelope.id} />
          </div>
        )}
      </section>

      {!isFree && user.status === "ACTIVE" && (
        <form action={allocate} className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          <input type="hidden" name="envelopeId" value={envelope.id} />
          <p className="text-sm font-semibold text-slate-500">Lock money here</p>
          <p className="text-xs text-slate-500">Moves money from your available balance into this envelope.</p>
          <div className="mt-3 flex gap-2">
            <input
              name="amount"
              type="number"
              min="1"
              step="any"
              placeholder="Amount in ₦"
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-brand-500"
              required
            />
            <button className="rounded-xl bg-brand-700 px-5 font-semibold text-white">Lock</button>
          </div>
          {searchParams.error && <p className="mt-2 text-sm text-frozen-600">{searchParams.error}</p>}
        </form>
      )}

      <section className="mt-6">
        <h2 className="mb-3 font-bold">Release timeline</h2>
        <ol className="relative ml-2 border-l-2 border-gray-200 pl-5">
          {[...planned].reverse().map((p, i) => (
            <li key={`p${i}`} className="relative mb-4">
              <span className="absolute -left-[1.7rem] top-1 h-3 w-3 rounded-full border-2 border-locked-800 bg-white" />
              <p className="text-sm font-medium">{formatNaira(p.amountKobo)} · {formatDate(p.at)}</p>
              <p className="text-xs text-slate-500">Scheduled, in {timeUntil(p.at)}</p>
            </li>
          ))}
          {envelope.releases.map((r) => (
            <li key={r.id} className="relative mb-4">
              <span className={`absolute -left-[1.7rem] top-1 h-3 w-3 rounded-full ${r.kind === "EARLY" ? "bg-warn-500" : "bg-locked-800"}`} />
              <p className="text-sm font-medium">{formatNaira(r.amountKobo)} · {formatDate(r.createdAt)}</p>
              <p className="text-xs text-slate-500">{r.kind === "EARLY" ? "Released early" : "Released on schedule"}</p>
            </li>
          ))}
          {planned.length === 0 && envelope.releases.length === 0 && <li className="text-sm text-slate-500">Nothing released yet.</li>}
        </ol>
      </section>

      {canRelease && <ReleaseEarlyButton envelopeId={envelope.id} type={envelope.type as "LOCKED" | "EMERGENCY"} />}
    </main>
  );
}
