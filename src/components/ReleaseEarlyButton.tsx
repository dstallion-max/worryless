"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReleaseEarlyButton({ envelopeId, type }: { envelopeId: string; type: "LOCKED" | "EMERGENCY" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function release() {
    const warning =
      type === "LOCKED"
        ? "Early release resets your discipline score to 0. Release this money now?"
        : "Emergency money unlocks after a cooling-off period. Continue?";
    if (!window.confirm(warning)) return;
    setBusy(true);
    const res = await fetch(`/api/envelopes/${envelopeId}/release-early`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    setMessage(body.message ?? body.error ?? null);
    router.refresh();
  }

  return (
    <div className="mt-8">
      <button
        onClick={release}
        disabled={busy}
        className="w-full rounded-lg border border-slate-300 bg-white py-3 font-medium text-slate-700 disabled:opacity-60"
      >
        {busy ? "Working…" : "Release early"}
      </button>
      <p className="mt-2 text-center text-xs text-warn-700">
        {type === "LOCKED" ? "Early release resets your discipline score." : "Emergency funds release after a cooling-off period."}
      </p>
      {message && <p className="mt-3 text-center text-sm text-slate-700">{message}</p>}
    </div>
  );
}
