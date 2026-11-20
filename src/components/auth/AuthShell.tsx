import Link from "next/link";
import { ShieldCheck } from "lucide-react";

/**
 * Shared frame for every signed-out screen. The heartbeat line is the one moving part:
 * it idles slowly, and speeds up while a request is in flight (`busy`).
 */
export default function AuthShell({
  title,
  subtitle,
  busy = false,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  busy?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-900 px-6 pb-20 pt-12 text-white">
        <Link href="/login" className="inline-flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <ShieldCheck size={22} />
          </span>
          <span className="text-lg font-extrabold tracking-tight">Worryless</span>
        </Link>
        <p className="mt-6 max-w-[18rem] text-[1.65rem] font-extrabold leading-tight tracking-tight">
          Lock your money to its purpose.
        </p>
        <p className="mt-2 max-w-[19rem] text-sm text-brand-100">
          Set aside what you can&apos;t afford to lose. Release it on the schedule you choose.
        </p>

        <svg
          viewBox="0 0 400 80"
          preserveAspectRatio="none"
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full"
        >
          <path
            d="M0 52 H110 l10 -7 l10 7 H168 l9 -30 l13 56 l11 -26 H236 l10 -9 l10 9 H400"
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M0 52 H110 l10 -7 l10 7 H168 l9 -30 l13 56 l11 -26 H236 l10 -9 l10 9 H400"
            pathLength={100}
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`ecg-pulse ${busy ? "ecg-fast" : ""}`}
          />
        </svg>
      </header>

      <section className="relative -mt-8 flex-1 rounded-t-3xl bg-gray-50 px-6 pb-10 pt-8">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-8 text-center text-sm text-slate-600">{footer}</div>}
        <p className="mt-8 text-center text-xs text-slate-400">Protected by Supabase Auth. We never store your card details.</p>
      </section>
    </main>
  );
}
