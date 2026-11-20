import Link from "next/link";
import { Bell, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import AutoRunSchedules from "@/components/AutoRunSchedules";
import { formatNaira } from "@/lib/money";
import { timeUntil } from "@/lib/time";
import QuickActions from "@/components/QuickActions";
import { seedStudentTemplate } from "./actions";

export const dynamic = "force-dynamic";

function greeting() {
  const hour = parseInt(
    new Date().toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }),
    10,
  );
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [envelopes, unread] = await Promise.all([
    prisma.envelope.findMany({ where: { userId: user.id }, include: { schedules: true }, orderBy: { createdAt: "asc" } }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  const freeKobo = envelopes.filter((e) => e.type === "FREE").reduce((s, e) => s + e.balanceKobo, 0);
  const lockedKobo = envelopes.filter((e) => e.type !== "FREE").reduce((s, e) => s + e.balanceKobo, 0);
  const hasLocked = envelopes.some((e) => e.type !== "FREE");
  const displayName = user.name ?? "there";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <main className="px-5 pt-6">
      <AutoRunSchedules />
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/profile" aria-label="Profile" className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
            {initials}
          </Link>
          <div>
            <p className="text-xs text-slate-500">{greeting()},</p>
            <p className="font-bold leading-tight">{displayName}</p>
          </div>
        </div>
        <Link href="/profile#notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className="relative rounded-full bg-white p-2.5 shadow-sm">
          <Bell size={22} className="text-slate-700" />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-frozen-500 ring-2 ring-white" />}
        </Link>
      </header>

      <section className="mt-6 rounded-3xl bg-gradient-to-br from-brand-600 to-brand-900 p-6 text-white shadow-md">
        <p className="text-sm text-brand-100">Available to Spend</p>
        <p className="mt-1 text-5xl font-extrabold tracking-tight">{formatNaira(freeKobo)}</p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm backdrop-blur">
          <Lock size={14} />
          Locked &amp; Scheduled {formatNaira(lockedKobo)}
        </div>
      </section>

      <QuickActions email={user.email} name={displayName} availableKobo={freeKobo} />

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">My Envelopes</h2>
          <Link href="/envelopes" className="text-sm font-medium text-brand-700">See all</Link>
        </div>

        {envelopes.length > 0 && (
          <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
            {envelopes.map((e) => {
              const next = e.schedules
                .filter((s) => s.status === "ACTIVE")
                .sort((a, b) => a.nextRunAt.getTime() - b.nextRunAt.getTime())[0];
              const isFree = e.type === "FREE";
              const unlockText = isFree
                ? "Free to spend"
                : next
                  ? `Next release in ${timeUntil(next.nextRunAt)}`
                  : e.lockedUntil && e.lockedUntil > new Date()
                    ? `Unlocks in ${timeUntil(e.lockedUntil)}`
                    : e.unlockDelayHours > 0
                      ? `Unlocks ${e.unlockDelayHours}h after you ask`
                      : "No unlock time set";
              return (
                <Link
                  key={e.id}
                  href={`/envelopes/${e.id}`}
                  className={`flex h-36 w-52 shrink-0 snap-start flex-col justify-between rounded-2xl p-4 text-white shadow-md ${
                    isFree ? "bg-free-500" : "bg-locked-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{e.name}</span>
                    {!isFree && <Lock size={16} className="opacity-70" />}
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold tracking-tight">{formatNaira(e.balanceKobo)}</p>
                    <p className="mt-1 text-xs opacity-80">{unlockText}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {!hasLocked && (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="font-bold">Student resumption template</h3>
            <p className="mt-1 text-sm text-slate-600">
              Four empty envelopes to start you off: Food, Transport, Airtime &amp; data and Emergency. Add money to your
              wallet, lock some into each one, then set when it gets released.
            </p>
            <form action={seedStudentTemplate} className="mt-4">
              <button className="w-full rounded-2xl bg-brand-700 py-3.5 font-semibold text-white">Use this template</button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
