"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Sheet, { fieldClass, labelClass } from "./Sheet";
import { useToast } from "./ui/Toast";
import { createEnvelope } from "@/app/(app)/envelopes/actions";
import { formatNaira } from "@/lib/money";

export default function CreateEnvelopeButton({ freeKobo }: { freeKobo: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await createEnvelope({ name, amountNaira: amount ? Number(amount) : null });
      toast(res.message, res.ok ? "success" : "error");
      if (res.ok) {
        setOpen(false);
        setName("");
        setAmount("");
        router.refresh();
      }
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm">
        <Plus size={16} strokeWidth={3} /> Add envelope
      </button>
      {open && (
        <Sheet title="New envelope" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="env-name" className={labelClass}>Name</label>
              <input id="env-name" className={fieldClass} placeholder="e.g. Daily food" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} required autoFocus />
            </div>
            <div>
              <label htmlFor="env-amount" className={labelClass}>Put in now (optional)</label>
              <input id="env-amount" className={fieldClass} type="number" inputMode="decimal" min="1" step="any" placeholder="Amount in ₦" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <p className="mt-1.5 text-xs text-slate-500">Comes from your available balance: {formatNaira(freeKobo)}.</p>
            </div>
            <button disabled={pending} className="h-12 w-full rounded-xl bg-brand-700 font-semibold text-white disabled:opacity-60">
              {pending ? "Creating…" : "Create envelope"}
            </button>
          </form>
        </Sheet>
      )}
    </>
  );
}
