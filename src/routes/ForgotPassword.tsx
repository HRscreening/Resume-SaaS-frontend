import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="h-16 w-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7l10 7 10-7M3 7v14h20V7M3 7l10 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#0F0F0F] mb-2">Check your email</h2>
        <p className="text-sm text-[#737373] mb-6">
          If an account exists for <strong className="text-[#0F0F0F]">{email}</strong>, we've sent a password reset link.
        </p>
        <Link to="/login" className="text-sm text-[#0F0F0F] underline underline-offset-2">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-[#0F0F0F] mb-1">Forgot password?</h1>
      <p className="text-sm text-[#737373] mb-8">
        Enter your email and we'll send you a reset link.
      </p>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full h-11 px-3.5 rounded-xl border border-[#D4D4D4] bg-white text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {loading && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
          Send reset link
        </button>
      </form>

      <p className="mt-6 text-sm text-center text-[#737373]">
        Remembered it?{" "}
        <Link to="/login" className="text-[#0F0F0F] font-medium underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </>
  );
}
