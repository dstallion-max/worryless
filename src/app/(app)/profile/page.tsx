import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { timeAgo } from "@/lib/time";
import SignOutButton from "@/components/SignOutButton";
import { markAllRead } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const unread = notifications.filter((n) => !n.read).length;
  const name = user.name ?? "there";

  return (
    <main className="px-5 pt-8">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
          {name.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">{name}</h1>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Discipline score</p>
          <p className="mt-1 text-2xl font-extrabold">{user.disciplineScore}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Last check-in</p>
          <p className="mt-1 text-lg font-bold" suppressHydrationWarning>{timeAgo(user.lastActiveAt)}</p>
        </div>
      </section>

      <section id="notifications" className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Notifications</h2>
          {unread > 0 && (
            <form action={markAllRead}>
              <button className="text-sm font-medium text-brand-700">Mark all as read</button>
            </form>
          )}
        </div>
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id} className={`rounded-2xl bg-white p-4 text-sm shadow-sm ${n.read ? "text-slate-500" : "font-medium"}`}>
              <p>{n.message}</p>
              <p className="mt-1 text-xs text-slate-400" suppressHydrationWarning>{timeAgo(n.createdAt)}</p>
            </li>
          ))}
          {notifications.length === 0 && <li className="text-sm text-slate-500">Nothing yet.</li>}
        </ul>
      </section>

      <div className="mt-8">
        <SignOutButton />
      </div>
    </main>
  );
}
