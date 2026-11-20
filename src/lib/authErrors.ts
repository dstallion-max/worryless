/** Turns Supabase/network errors into plain instructions the user can act on. */
export function friendlyAuthError(err: { message?: string; code?: string; status?: number } | null | undefined): string {
  const msg = (err?.message ?? "").toLowerCase();
  const code = (err?.code ?? "").toLowerCase();

  if (msg.includes("invalid login credentials")) return "That email and password don't match. Check them and try again.";
  if (msg.includes("email not confirmed")) return "Confirm your email first. We sent you a link when you signed up.";
  if (msg.includes("already registered") || code === "user_already_exists") return "An account with this email already exists. Sign in instead.";
  if (msg.includes("rate limit") || code.includes("rate_limit") || err?.status === 429) return "Too many attempts. Wait a minute and try again.";
  if (msg.includes("failed to fetch") || msg.includes("network")) return "Can't reach the server. Check your internet connection and try again.";
  if (msg.includes("same password") || code === "same_password") return "Choose a password you haven't used on this account before.";
  if (msg.includes("weak") || code === "weak_password") return "That password is too easy to guess. Add more characters or numbers.";
  if (msg.includes("expired") || msg.includes("invalid") && msg.includes("token")) return "This link has expired. Request a new one.";
  return err?.message || "Something went wrong. Try again.";
}
