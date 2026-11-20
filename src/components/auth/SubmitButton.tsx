import { Check, Loader2 } from "lucide-react";

export default function SubmitButton({
  busy,
  done,
  idle,
  busyText,
  doneText,
  disabled,
}: {
  busy: boolean;
  done: boolean;
  idle: string;
  busyText: string;
  doneText: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={busy || done || disabled}
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed ${
        done ? "bg-free-600" : "bg-brand-700 hover:bg-brand-800 disabled:bg-brand-700/60"
      }`}
    >
      {done ? (
        <>
          <Check size={18} strokeWidth={3} /> {doneText}
        </>
      ) : busy ? (
        <>
          <Loader2 size={18} className="animate-spin" /> {busyText}
        </>
      ) : (
        idle
      )}
    </button>
  );
}
