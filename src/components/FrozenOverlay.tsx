"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function FrozenOverlay() {
  const router = useRouter();
  const [verifying, setVerifying] = useState(false);
  const [bvn, setBvn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function unfreeze(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/unfreeze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bvnLast4: bvn }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not unfreeze. Try again.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[60] mx-auto flex max-w-md flex-col items-center justify-center bg-gradient-to-b from-frozen-500 to-frozen-700 px-8 text-center text-white">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
        <Lock size={38} />
      </div>
      <h2 className="mt-6 text-2xl font-bold">Account Frozen</h2>
      <p className="mt-2 text-red-50">
        We froze your account for your security because you did not check in for 7 days. Your schedules are paused.
      </p>

      {!verifying ? (
        <button onClick={() => setVerifying(true)} className="mt-8 w-full rounded-2xl bg-white py-4 font-semibold text-frozen-700">
          Tap to verify
        </button>
      ) : (
        <form onSubmit={unfreeze} className="mt-8 w-full space-y-3">
          <input
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            value={bvn}
            onChange={(e) => setBvn(e.target.value.replace(/\D/g, ""))}
            placeholder="Last 4 digits of your BVN"
            className="w-full rounded-2xl px-4 py-4 text-center text-slate-900"
            autoFocus
            required
          />
          {error && <p className="text-sm text-red-50">{error}</p>}
          <button
            disabled={busy || bvn.length !== 4}
            className="w-full rounded-2xl bg-white py-4 font-semibold text-frozen-700 disabled:opacity-60"
          >
            {busy ? "Checking…" : "Unfreeze account"}
          </button>
        </form>
      )}
    </div>
  );
}
