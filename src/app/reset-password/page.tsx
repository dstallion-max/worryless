"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import PasswordField, { PasswordMeter } from "@/components/auth/PasswordField";
import SubmitButton from "@/components/auth/SubmitButton";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/authErrors";
import { checkPassword } from "@/lib/password";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pw = checkPassword(password);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (busy || done || !pw.valid) return;
    setBusy(true);
    setError(null);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) {
      setBusy(false);
      return setError(friendlyAuthError(updateError));
    }
    setBusy(false);
    setDone(true);
    toast("Password updated.", "success");
    setTimeout(() => {
      router.replace("/dashboard");
      router.refresh();
    }, 650);
  }

  return (
    <AuthShell busy={busy || done} title="Choose a new password" subtitle="Pick something you don't use anywhere else.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <PasswordField
            label="New password"
            value={password}
            onChange={setPassword}
            onBlur={() => setTouched(true)}
            error={touched && !pw.valid ? "Use at least 8 characters with a letter and a number." : null}
            autoComplete="new-password"
            disabled={busy || done}
            autoFocus
          />
          <PasswordMeter password={password} />
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-frozen-50 px-3.5 py-3 text-sm font-medium text-frozen-700">
            {error}
          </p>
        )}
        <SubmitButton busy={busy} done={done} idle="Update password" busyText="Updating…" doneText="Password updated" />
      </form>
    </AuthShell>
  );
}
