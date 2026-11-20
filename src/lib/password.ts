export type PasswordChecks = { length: boolean; letter: boolean; number: boolean };

export function checkPassword(pw: string) {
  const checks: PasswordChecks = {
    length: pw.length >= 8,
    letter: /[A-Za-z]/.test(pw),
    number: /\d/.test(pw),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  // 0 to 4: the extra point is for a long password.
  const score = pw.length === 0 ? 0 : Math.min(4, passed + (pw.length >= 12 && passed === 3 ? 1 : 0));
  const valid = checks.length && checks.letter && checks.number;
  return { checks, score, valid };
}

export const STRENGTH_LABELS = ["", "Weak", "Okay", "Good", "Strong"];

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
