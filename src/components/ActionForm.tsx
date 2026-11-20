"use client";

import { useTransition } from "react";

/** Runs a server action with a pending state, so the button can't be tapped twice. */
export default function ActionForm({
  action,
  submitLabel,
  pendingLabel,
  className = "",
  buttonClass = "h-12 w-full rounded-xl bg-brand-700 font-semibold text-white disabled:opacity-60",
  children,
}: {
  action: (formData: FormData) => Promise<unknown>;
  submitLabel: string;
  pendingLabel: string;
  className?: string;
  buttonClass?: string;
  children: React.ReactNode;
}) {
  const [pending, start] = useTransition();
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        start(async () => {
          await action(data);
        });
      }}
    >
      {children}
      <button disabled={pending} className={buttonClass}>
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
