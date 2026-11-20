"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Phone, ArrowUpRight, X, CheckCircle2, AlertCircle } from "lucide-react";
import { openInterswitchCheckout } from "@/lib/payment/interswitch-client";
import { formatNaira } from "@/lib/money";

type SheetKind = "fund" | "airtime" | "send" | null;
type Toast = { kind: "success" | "error"; text: string } | null;

const json = { "Content-Type": "application/json" };

export default function QuickActions({
  email,
  name,
  availableKobo,
}: {
  email: string;
  name: string;
  availableKobo: number;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function open(kind: SheetKind) {
    setSheet(kind);
    setAmount("");
    setRecipient("");
    setError(null);
    setBusy(false);
  }
  const close = () => open(null);

  function parseKobo(): number | null {
    const naira = Number(amount);
    if (!Number.isFinite(naira) || naira < 10) {
      setError("The minimum amount is ₦10.");
      return null;
    }
    return Math.round(naira * 100);
  }

  async function fund(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const kobo = parseKobo();
    if (!kobo) return;
    setBusy(true);

    const init = await fetch("/api/wallet/fund/init", { method: "POST", headers: json, body: JSON.stringify({ amountKobo: kobo }) });
    const initBody = await init.json().catch(() => ({}));
    if (!init.ok) {
      setError(initBody.error ?? "Could not start the payment.");
      setBusy(false);
      return;
    }

    const txnRef: string = initBody.txnRef;
    const opened = openInterswitchCheckout({
      txnRef,
      amountKobo: kobo,
      email,
      name,
      onComplete: async (resp) => {
        if (resp?.resp !== "00") {
          setBusy(false);
          setToast({ kind: "error", text: "Payment was not completed. You have not been charged." });
          return;
        }
        // The popup says it worked; the server confirms with Interswitch before crediting.
        const v = await fetch("/api/wallet/fund/verify", { method: "POST", headers: json, body: JSON.stringify({ txnRef }) });
        const vb = await v.json().catch(() => ({}));
        setBusy(false);
        if (v.ok && vb.status === "SUCCESS") {
          setSheet(null);
          setToast({ kind: "success", text: `${formatNaira(kobo)} added to your wallet.` });
          router.refresh();
        } else {
          setToast({
            kind: "error",
            text: vb.message ?? "We could not confirm your payment yet. If you were charged, contact support with reference " + txnRef,
          });
        }
      },
    });

    if (!opened) {
      setError("The payment window is still loading. Try again in a moment.");
      setBusy(false);
    }
  }

  async function spend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const kobo = parseKobo();
    if (!kobo || !sheet) return;
    setBusy(true);
    const res = await fetch("/api/wallet/spend", {
      method: "POST",
      headers: json,
      body: JSON.stringify({ kind: sheet === "airtime" ? "AIRTIME" : "SEND", recipient, amountKobo: kobo }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setSheet(null);
    setToast({
      kind: "success",
      text: sheet === "airtime" ? `${formatNaira(kobo)} airtime sent (test mode).` : `${formatNaira(kobo)} sent (test mode).`,
    });
    router.refresh();
  }

  const actions = [
    { kind: "fund" as const, label: "Fund Wallet", Icon: Plus },
    { kind: "airtime" as const, label: "Airtime", Icon: Phone },
    { kind: "send" as const, label: "Send", Icon: ArrowUpRight },
  ];

  const title = sheet === "fund" ? "Fund wallet" : sheet === "airtime" ? "Buy airtime" : "Send money";
  const input = "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-base outline-none focus:border-brand-500";

  return (
    <>
      <div className="mt-6 flex justify-around">
        {actions.map(({ kind, label, Icon }) => (
          <button key={kind} onClick={() => open(kind)} className="flex flex-col items-center gap-2 text-sm font-medium text-slate-700">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700 transition active:scale-95">
              <Icon size={24} />
            </span>
            {label}
          </button>
        ))}
      </div>

      {toast && (
        <div
          role="status"
          className={`toast-in fixed left-1/2 top-4 z-[70] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.kind === "success" ? "bg-free-600" : "bg-frozen-600"
          }`}
        >
          {toast.kind === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {toast.text}
        </div>
      )}

      {sheet && (
        <div className="fixed inset-0 z-[55] mx-auto flex max-w-md items-end bg-black/40" onClick={close}>
          <form
            onSubmit={sheet === "fund" ? fund : spend}
            onClick={(e) => e.stopPropagation()}
            className="sheet-up w-full space-y-4 rounded-t-3xl bg-white p-6 pb-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{title}</h2>
              <button type="button" onClick={close} aria-label="Close" className="rounded-full p-1 text-slate-500">
                <X size={22} />
              </button>
            </div>

            {sheet !== "fund" && (
              <>
                <p className="text-sm text-slate-600">Available: {formatNaira(availableKobo)}. Test mode: no real money leaves yet.</p>
                <input
                  className={input}
                  inputMode="numeric"
                  placeholder={sheet === "airtime" ? "Phone number (08012345678)" : "10-digit account number"}
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </>
            )}

            <div>
              <input
                className={input}
                type="number"
                inputMode="decimal"
                min="10"
                step="any"
                placeholder="Amount in ₦ (minimum 10)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              {sheet === "fund" && <p className="mt-2 text-xs text-slate-500">You will pay securely with Interswitch. Cards are never stored in Worryless.</p>}
            </div>

            {error && <p className="text-sm text-frozen-600">{error}</p>}

            <button disabled={busy} className="w-full rounded-2xl bg-brand-700 py-4 font-semibold text-white transition active:scale-[0.99] disabled:opacity-60">
              {busy ? "Please wait…" : sheet === "fund" ? "Pay with Interswitch" : "Confirm"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
