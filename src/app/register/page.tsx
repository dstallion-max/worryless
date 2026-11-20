"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import AuthInput from "@/components/auth/AuthInput";
import PasswordField, { PasswordMeter } from "@/components/auth/PasswordField";
import SubmitButton from "@/components/auth/SubmitButton";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/authErrors";
import { checkPassword, isValidEmail } from "@/lib/password";

const RESEND_SECONDS = 30;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ name: false, email: false, password: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const pw = checkPassword(password);
  const nameError = touched.name && name.trim().length < 2 ? "Enter your name." : null;
  const emailError = touched.email && !isValidEmail(email) ? "Enter a valid email address." : null;
  const passwordError = touched.password && !pw.valid ? "Use at least 8 characters with a letter and a number." : null;

  function fail(message: string) {
    setError(message);
    setBusy(false);
    setShake(true);
    setTimeout(() => setShake(false), 450);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || done) return;
    setTouched({ name: true, email: true, password: true });
    if (name.trim().length < 2 || !isValidEmail(email) || !pw.valid) return;

    setBusy(true);
    setError(null);
    const { data, error: authError } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) return fail(friendlyAuthError(authError));

    // Supabase hides duplicate emails when confirmation is on: it returns a user with no identities.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return fail("An account with this email already exists. Sign in instead.");
    }

    if (!data.session) {
      // Email confirmation is switched on in Supabase.
      setBusy(false);
      setSentTo(email.trim());
      setCooldown(RESEND_SECONDS);
      return;
    }

    const res = await fetch("/api/ensure-user", { method: "POST" }).catch(() => null);
    if (!res || !res.ok) return fail("Your account was created, but we couldn't finish setting it up. Sign in to continue.");

    setBusy(false);
    setDone(true);
    toast(`Welcome to Worryless, ${name.trim().split(" ")[0]}.`, "success");
    setTimeout(() => {
      router.replace("/dashboard");
      router.refresh();
    }, 650);
  }

  async function resend() {
    if (!sentTo || cooldown > 0) return;
    const { error: resendError } = await createClient().auth.resend({
      type: "signup",
      email: sentTo,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (resendError) return toast(friendlyAuthError(resendError), "error");
    setCooldown(RESEND_SECONDS);
    toast("Confirmation email sent again.", "success");
  }

  if (sentTo) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`We sent a confirmation link to ${sentTo}. Open it on this device to finish.`}
        footer={
          <>
            Wrong address?{" "}
            <button onClick={() => setSentTo(null)} className="font-semibold text-brand-700 hover:underline">
              Go back
            </button>
          </>
        }
      >
        <div className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <MailCheck size={28} />
          </span>
          <p className="mt-4 text-sm text-slate-600">
            Can&apos;t see it? Check your spam folder. The link works once and expires after an hour.
          </p>
          <button
            onClick={resend}
            disabled={cooldown > 0}
            className="mt-5 h-11 w-full rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 disabled:text-slate-400"
          >
            {cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend email"}
          </button>
          <Link href="/login" className="mt-3 text-sm font-semibold text-brand-700 hover:underline">
            I&apos;ve confirmed, sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      busy={busy || done}
      title="Create your account"
      subtitle="Takes under a minute. You start with ₦0 and add money when you're ready."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-700 underline-offset-2 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className={`space-y-4 ${shake ? "shake" : ""}`}>
        <AuthInput
          id="name"
          label="Full name"
          autoComplete="name"
          placeholder="Ada Okafor"
          value={name}
          onChange={setName}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          error={nameError}
          valid={name.trim().length >= 2}
          disabled={busy || done}
          autoFocus
        />
        <AuthInput
          id="email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={emailError}
          valid={isValidEmail(email)}
          disabled={busy || done}
        />
        <div>
          <PasswordField
            value={password}
            onChange={setPassword}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={passwordError}
            autoComplete="new-password"
            placeholder="Create a password"
            disabled={busy || done}
          />
          <PasswordMeter password={password} />
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-frozen-50 px-3.5 py-3 text-sm font-medium text-frozen-700">
            {error}{" "}
            {error.includes("already exists") && (
              <Link href="/login" className="underline">
                Go to sign in
              </Link>
            )}
          </p>
        )}

        <SubmitButton busy={busy} done={done} idle="Create account" busyText="Creating your account…" doneText="Account created" />
        <p className="text-center text-xs text-slate-500">By continuing you agree to keep your Worryless login private.</p>
      </form>
    </AuthShell>
  );
}
