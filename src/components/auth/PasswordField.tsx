"use client";

import { useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import AuthInput from "./AuthInput";
import { STRENGTH_LABELS, checkPassword } from "@/lib/password";

type Props = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  disabled?: boolean;
  labelRight?: React.ReactNode;
  autoFocus?: boolean;
};

export default function PasswordField({ id = "password", label = "Password", ...rest }: Props) {
  const [show, setShow] = useState(false);
  return (
    <AuthInput
      id={id}
      label={label}
      type={show ? "text" : "password"}
      right={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="rounded-md p-1 text-slate-500 hover:text-slate-800"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      }
      {...rest}
    />
  );
}

const BAR = ["bg-slate-200", "bg-frozen-500", "bg-warn-500", "bg-free-400", "bg-free-600"];

/** Live feedback while the user picks a password. */
export function PasswordMeter({ password }: { password: string }) {
  const { checks, score } = checkPassword(password);
  const rules: [boolean, string][] = [
    [checks.length, "8+ characters"],
    [checks.letter, "A letter"],
    [checks.number, "A number"],
  ];
  return (
    <div className="mt-3" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= score ? BAR[score] : "bg-slate-200"}`} />
          ))}
        </div>
        <span className="w-12 text-right text-xs font-semibold text-slate-600">{STRENGTH_LABELS[score]}</span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {rules.map(([ok, text]) => (
          <li key={text} className={`flex items-center gap-1 text-xs ${ok ? "font-medium text-free-700" : "text-slate-500"}`}>
            <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${ok ? "bg-free-500 text-white" : "bg-slate-200"}`}>
              {ok && <Check size={10} strokeWidth={4} />}
            </span>
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}
