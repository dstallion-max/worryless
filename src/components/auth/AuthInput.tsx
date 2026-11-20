"use client";

import { Check } from "lucide-react";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "numeric" | "tel";
  autoFocus?: boolean;
  disabled?: boolean;
  maxLength?: number;
  error?: string | null;
  valid?: boolean;
  hint?: string;
  /** Replaces the green check, e.g. the show/hide password button. */
  right?: React.ReactNode;
  labelRight?: React.ReactNode;
};

export default function AuthInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
  autoFocus,
  disabled,
  maxLength,
  error,
  valid,
  hint,
  right,
  labelRight,
}: Props) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-semibold text-slate-700">
          {label}
        </label>
        {labelRight}
      </div>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          autoFocus={autoFocus}
          disabled={disabled}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          autoCapitalize="none"
          spellCheck={false}
          className={`h-12 w-full rounded-xl border bg-white pl-3.5 pr-11 text-[15px] outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:opacity-60 ${
            error
              ? "border-frozen-500 focus:border-frozen-500 focus:ring-frozen-100"
              : "border-slate-300 focus:border-brand-600 focus:ring-brand-100"
          }`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {right ?? (valid && !error ? <Check size={18} className="text-free-500" aria-label="Looks good" /> : null)}
        </div>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-frozen-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
