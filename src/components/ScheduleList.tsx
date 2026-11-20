"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Trash2, Zap } from "lucide-react";
import { useToast } from "./ui/Toast";
import { deleteSchedule, executeScheduleNow, setScheduleStatus } from "@/app/(app)/envelopes/actions";

export type ScheduleRow = {
  id: string;
  description: string;
  nextLabel: string;
  status: "ACTIVE" | "PAUSED" | "FAILED";
  lastError: string | null;
};

export default function ScheduleList({ rows, disabled }: { rows: ScheduleRow[]; disabled: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function run(id: string, job: () => Promise<{ ok: boolean; message: string }>) {
    setBusyId(id);
    start(async () => {
      const res = await job();
      toast(res.message, res.ok ? "success" : "error");
      setBusyId(null);
      router.refresh();
    });
  }

  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const busy = pending && busyId === r.id;
        return (
          <li key={r.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="font-medium leading-snug">{r.description}</p>
            <p className="mt-1 text-xs text-slate-500">
              {r.status === "ACTIVE" && `Next run: ${r.nextLabel}`}
              {r.status === "PAUSED" && "Paused"}
              {r.status === "FAILED" && <span className="text-frozen-600">Failed: {r.lastError ?? "see notifications"}</span>}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.status === "ACTIVE" && (
                <button
                  onClick={() => run(r.id, () => executeScheduleNow(r.id))}
                  disabled={busy || disabled}
                  className="flex items-center gap-1.5 rounded-full bg-brand-700 px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  <Zap size={14} /> {busy ? "Running…" : "Execute now"}
                </button>
              )}
              {r.status === "ACTIVE" ? (
                <button onClick={() => run(r.id, () => setScheduleStatus(r.id, "PAUSED"))} disabled={busy || disabled} className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60">
                  <Pause size={14} /> Pause
                </button>
              ) : (
                <button onClick={() => run(r.id, () => setScheduleStatus(r.id, "ACTIVE"))} disabled={busy || disabled} className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60">
                  <Play size={14} /> Resume
                </button>
              )}
              <button
                onClick={() => window.confirm("Delete this schedule?") && run(r.id, () => deleteSchedule(r.id))}
                disabled={busy || disabled}
                aria-label="Delete schedule"
                className="ml-auto rounded-full p-2 text-slate-500 disabled:opacity-60"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
