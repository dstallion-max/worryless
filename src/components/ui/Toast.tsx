"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type Kind = "success" | "error" | "info";
type ToastItem = { id: number; kind: Kind; message: string };

const ToastContext = createContext<{ toast: (message: string, kind?: Kind) => void }>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

const STYLES: Record<Kind, { box: string; Icon: typeof Info }> = {
  success: { box: "bg-free-600 text-white", Icon: CheckCircle2 },
  error: { box: "bg-frozen-600 text-white", Icon: AlertCircle },
  info: { box: "bg-locked-800 text-white", Icon: Info },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (message: string, kind: Kind = "success") => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-2), { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === "error" ? 5000 : 3200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-[100] mx-auto flex w-full max-w-md flex-col gap-2 px-4"
      >
        {items.map((t) => {
          const { box, Icon } = STYLES[t.kind];
          return (
            <div key={t.id} role="status" className={`toast-in pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3 shadow-lg ${box}`}>
              <Icon size={20} className="mt-0.5 shrink-0" />
              <p className="flex-1 text-sm font-medium">{t.message}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="shrink-0 opacity-80">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
