"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/time";
import { useToast } from "@/components/ui/Toast";

const WARN_AFTER_DAYS = 5;

/** Floating pill above the bottom nav. Tap it to confirm you are still active. */
export default function HeartbeatBar({ lastActiveAt }: { lastActiveAt: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const days = (Date.now() - new Date(lastActiveAt).getTime()) / 86_400_000;
  const warning = days >= WARN_AFTER_DAYS;
  const daysLeft = Math.max(1, Math.ceil(7 - days));

  async function confirm() {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/heartbeat", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      toast("Couldn't confirm. Check your connection and try again.", "error");
      return;
    }
    if (res.ok) {
      toast("Checked in. Your schedules stay active.", "success");
      setConfirmed(true);
      router.refresh();
      setTimeout(() => setConfirmed(false), 2500);
    }
  }

  const dot = warning ? "bg-warn-500" : "bg-free-500";

  return (
    <div className="pointer-events-none fixed bottom-[4.75rem] left-1/2 z-40 -translate-x-1/2">
      <button
        onClick={confirm}
        disabled={busy}
        aria-label={warning ? "Confirm you are still active. Your account will freeze soon." : "Confirm you are still active"}
        className={`pointer-events-auto flex items-center gap-2 rounded-full border-2 bg-white px-4 py-2 shadow-md transition active:scale-95 ${
          warning ? "border-warn-400" : "border-free-500"
        }`}
      >
        {confirmed ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path className="check-draw" d="M4 12.5l5 5L20 6.5" />
          </svg>
        ) : (
          <span className="relative flex h-2.5 w-2.5">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none ${dot}`} />
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dot}`} />
          </span>
        )}
        <span className="text-sm font-semibold text-slate-800">{confirmed ? "Confirmed" : warning ? `Confirm in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}` : "Active"}</span>
        <span className="text-xs text-slate-500" suppressHydrationWarning>
          {timeAgo(lastActiveAt)}
        </span>
      </button>
    </div>
  );
}
