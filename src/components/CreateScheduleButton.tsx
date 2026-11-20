"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import Sheet, { fieldClass, labelClass } from "./Sheet";
import { useToast } from "./ui/Toast";
import { createSchedule } from "@/app/(app)/envelopes/actions";
import { BANKS } from "@/lib/banks";

type RType = "AIRTIME" | "BANK" | "INTERNAL";
type Freq = "DAILY" | "WEEKLY" | "MONTHLY";

/** Value for <input type="datetime-local">, in the device's own time. */
function localInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreateScheduleButton({ envelopeId }: { envelopeId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<RType>("AIRTIME");
  const [phone, setPhone] = useState("");
  const [account, setAccount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [frequency, setFrequency] = useState<Freq>("DAILY");
  const [startAt, setStartAt] = useState("");

  function openSheet() {
    // Default to two minutes from now so a new schedule can be tested straight away.
    setStartAt(localInput(new Date(Date.now() + 2 * 60_000)));
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const bank = BANKS.find((b) => b.code === bankCode);
    const when = new Date(startAt);
    if (Number.isNaN(when.getTime())) return toast("Pick a start date and time.", "error");
    start(async () => {
      const res = await createSchedule({
        envelopeId,
        amountNaira: Number(amount),
        recipientType: type,
        phone,
        accountNumber: account,
        bankCode: bank?.code,
        bankName: bank?.name,
        accountName,
        frequency,
        startAtIso: when.toISOString(),
      });
      toast(res.message, res.ok ? "success" : "error");
      if (res.ok) {
        setOpen(false);
        setAmount("");
        setPhone("");
        setAccount("");
        setAccountName("");
        router.refresh();
      }
    });
  }

  return (
    <>
      <button onClick={openSheet} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-300 py-3 font-semibold text-brand-700">
        <CalendarClock size={18} /> Create schedule
      </button>
      {open && (
        <Sheet title="New schedule" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="s-amount" className={labelClass}>Amount (₦)</label>
              <input id="s-amount" className={fieldClass} type="number" inputMode="decimal" min="1" step="any" placeholder="2000" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />
            </div>

            <div>
              <label htmlFor="s-type" className={labelClass}>Send it to</label>
              <select id="s-type" className={fieldClass} value={type} onChange={(e) => setType(e.target.value as RType)}>
                <option value="AIRTIME">Airtime (phone number)</option>
                <option value="BANK">Bank account</option>
                <option value="INTERNAL">My available balance</option>
              </select>
            </div>

            {type === "AIRTIME" && (
              <div>
                <label htmlFor="s-phone" className={labelClass}>Phone number</label>
                <input id="s-phone" className={fieldClass} inputMode="tel" placeholder="08031234567" maxLength={11} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} required />
              </div>
            )}

            {type === "BANK" && (
              <>
                <div>
                  <label htmlFor="s-bank" className={labelClass}>Bank</label>
                  <select id="s-bank" className={fieldClass} value={bankCode} onChange={(e) => setBankCode(e.target.value)} required>
                    <option value="">Choose a bank</option>
                    {BANKS.map((b) => (
                      <option key={b.code} value={b.code}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="s-acct" className={labelClass}>Account number</label>
                  <input id="s-acct" className={fieldClass} inputMode="numeric" placeholder="0123456789" maxLength={10} value={account} onChange={(e) => setAccount(e.target.value.replace(/\D/g, ""))} required />
                </div>
                <div>
                  <label htmlFor="s-name" className={labelClass}>Account name (optional)</label>
                  <input id="s-name" className={fieldClass} value={accountName} onChange={(e) => setAccountName(e.target.value)} maxLength={60} />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="s-freq" className={labelClass}>Repeats</label>
                <select id="s-freq" className={fieldClass} value={frequency} onChange={(e) => setFrequency(e.target.value as Freq)}>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
              <div>
                <label htmlFor="s-start" className={labelClass}>First run</label>
                <input id="s-start" className={`${fieldClass} px-2 text-sm`} type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
              </div>
            </div>

            <button disabled={pending} className="h-12 w-full rounded-xl bg-brand-700 font-semibold text-white disabled:opacity-60">
              {pending ? "Saving…" : "Create schedule"}
            </button>
          </form>
        </Sheet>
      )}
    </>
  );
}
