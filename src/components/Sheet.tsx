"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/** Bottom sheet used for the create-envelope and create-schedule flows. */
export default function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="sheet-up max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 pb-8"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full bg-gray-100 p-2 text-slate-600">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const fieldClass =
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-[15px] outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100";
export const labelClass = "mb-1.5 block text-sm font-semibold text-slate-700";
