import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";
import { passwordStrength } from "@/lib/passwordValidation";
import { isAuthenticated } from "@/lib/auth";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const strength = passwordStrength(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = strength.isValid && passwordsMatch;

  useEffect(() => {
    // The auth/callback route should have set up the recovery session before
    // routing here. Verify it landed correctly.
    if (!isAuthenticated()) {
      setError("Reset link expired or invalid. Please request a new one.");
    }
    setSessionReady(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => navigate({ to: "/dashboard" }), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  if (!sessionReady) {
    return (
      <div className="text-center">
        <div className="h-6 w-6 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin mx-auto" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="h-16 w-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 14l6 6L23 8" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#0F0F0F] mb-2">Password updated</h2>
        <p className="text-sm text-[#737373]">Redirecting to your dashboard…</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-[#0F0F0F] mb-1">Set a new password</h1>
      <p className="text-sm text-[#737373] mb-8">
        Choose a strong password you haven't used before.
      </p>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
          {error.includes("expired") && (
            <Link to="/forgot-password" className="block mt-2 underline">
              Request a new reset link
            </Link>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">
            New password
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            placeholder="Enter new password"
            showStrength
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">
            Confirm new password
          </label>
          <PasswordInput
            id="confirm-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Re-enter new password"
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="text-xs text-red-600 mt-1.5">Passwords don't match</p>
          )}
          {passwordsMatch && (
            <p className="text-xs text-green-700 mt-1.5 flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6.5l2.5 2.5L10 3.5" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Passwords match
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="w-full h-11 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {loading && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
          Update password
        </button>
      </form>
    </>
  );
}
