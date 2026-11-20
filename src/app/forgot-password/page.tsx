"use client";

import Link from "next/link";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import AuthInput from "@/components/auth/AuthInput";
import SubmitButton from "@/components/auth/SubmitButton";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/authErrors";
import { isValidEmail } from "@/lib/password";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (busy || !isValidEmail(email)) return;
    setBusy(true);
    setError(null);
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (resetError) return setError(friendlyAuthError(resetError));
    setSent(true);
  }

  return (
    <AuthShell
      busy={busy}
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to choose a new password."
      footer={
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <MailCheck size={28} />
          </span>
          <p className="mt-4 font-semibold">Check your inbox</p>
          <p className="mt-1 text-sm text-slate-600">
            If an account exists for {email.trim()}, a reset link is on its way. It expires after an hour.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <AuthInput
            id="email"
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={setEmail}
            onBlur={() => setTouched(true)}
            error={touched && !isValidEmail(email) ? "Enter a valid email address." : null}
            valid={isValidEmail(email)}
            disabled={busy}
            autoFocus
          />
          {error && (
            <p role="alert" className="rounded-xl bg-frozen-50 px-3.5 py-3 text-sm font-medium text-frozen-700">
              {error}
            </p>
          )}
          <SubmitButton busy={busy} done={false} idle="Send reset link" busyText="Sending…" doneText="Sent" />
        </form>
      )}
    </AuthShell>
  );
}
