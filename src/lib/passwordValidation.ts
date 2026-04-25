export interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters",       test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter (A-Z)",  test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter (a-z)",  test: (pw) => /[a-z]/.test(pw) },
  { label: "One number (0-9)",            test: (pw) => /[0-9]/.test(pw) },
  { label: "One special character (!@#$…)", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export function passwordStrength(pw: string): {
  passed: number;
  total: number;
  isValid: boolean;
  failedRules: string[];
} {
  const results = PASSWORD_RULES.map((r) => ({ rule: r, ok: r.test(pw) }));
  const passed = results.filter((r) => r.ok).length;
  return {
    passed,
    total: PASSWORD_RULES.length,
    isValid: passed === PASSWORD_RULES.length,
    failedRules: results.filter((r) => !r.ok).map((r) => r.rule.label),
  };
}
