"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthInput from "@/components/auth/AuthInput";
import PasswordField from "@/components/auth/PasswordField";
import SubmitButton from "@/components/auth/SubmitButton";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/authErrors";
import { isValidEmail } from "@/lib/password";

const EMAIL_KEY = "mg:last-email";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(EMAIL_KEY);
      if (saved) {
        setEmail(saved);
        setReturning(true);
      }
    } catch {
      /* storage blocked: fine */
    }
    const q = new URLSearchParams(window.location.search);
    if (q.get("error") === "link") setError("That link has expired or was already used. Sign in, or request a new one.");
  }, []);

  const emailError = touched.email && !isValidEmail(email) ? "Enter a valid email address." : null;
  const passwordError = touched.password && password.length === 0 ? "Enter your password." : null;

  function fail(message: string) {
    setError(message);
    setBusy(false);
    setShake(true);
    setTimeout(() => setShake(false), 450);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || done) return;
    setTouched({ email: true, password: true });
    if (!isValidEmail(email) || password.length === 0) return;

    setBusy(true);
    setError(null);
    const { error: authError } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (authError) return fail(friendlyAuthError(authError));

    // Creates our own User row the first time someone signs in.
    const res = await fetch("/api/ensure-user", { method: "POST" }).catch(() => null);
    if (!res || !res.ok) return fail("You're signed in, but we couldn't load your account. Try again.");

    try {
      localStorage.setItem(EMAIL_KEY, email.trim());
    } catch {
      /* ignore */
    }
    setBusy(false);
    setDone(true);
    toast("Signed in. Welcome back.", "success");
    setTimeout(() => {
      router.replace("/dashboard");
      router.refresh();
    }, 650);
  }

  return (
    <AuthShell
      busy={busy || done}
      title={returning ? "Welcome back" : "Sign in"}
      subtitle="Pick up where you left off. Your envelopes are exactly as you left them."
      footer={
        <>
          New to Worryless?{" "}
          <Link href="/register" className="font-semibold text-brand-700 underline-offset-2 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className={`space-y-4 ${shake ? "shake" : ""}`}>
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
          autoFocus={!returning}
        />
        <PasswordField
          value={password}
          onChange={setPassword}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={passwordError}
          autoComplete="current-password"
          placeholder="Your password"
          disabled={busy || done}
          autoFocus={returning}
          labelRight={
            <Link href="/forgot-password" className="text-xs font-semibold text-brand-700 hover:underline">
              Forgot password?
            </Link>
          }
        />

        {error && (
          <p role="alert" className="rounded-xl bg-frozen-50 px-3.5 py-3 text-sm font-medium text-frozen-700">
            {error}
          </p>
        )}

        <SubmitButton busy={busy} done={done} idle="Sign in" busyText="Signing in…" doneText="Signed in" />
      </form>
    </AuthShell>
  );
}
