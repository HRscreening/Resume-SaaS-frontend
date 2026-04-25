import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingUser, setExistingUser] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setExistingUser(false);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
      });
      if (authError) throw authError;

      // Supabase returns user with empty identities[] when account already exists
      // (it doesn't throw an error to prevent email enumeration)
      if (data.user && data.user.identities?.length === 0) {
        setExistingUser(true);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
  }

  if (existingUser) {
    return (
      <div className="text-center">
        <div className="h-16 w-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="14" cy="14" r="11"/>
            <path d="M14 9v6M14 19h.01"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#0F0F0F] mb-2">Account already exists</h2>
        <p className="text-sm text-[#737373] mb-6">
          An account with <strong className="text-[#0F0F0F]">{email}</strong> already exists.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            to="/login"
            className="w-full h-11 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] transition-colors flex items-center justify-center"
          >
            Sign in instead
          </Link>
          <button
            onClick={() => { setExistingUser(false); setEmail(""); setPassword(""); }}
            className="text-xs text-[#737373] hover:text-[#0F0F0F]"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="h-16 w-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 14l6 6L23 8"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#0F0F0F] mb-2">Check your email</h2>
        <p className="text-sm text-[#737373]">
          We sent a confirmation link to <strong className="text-[#0F0F0F]">{email}</strong>. Click it to activate your account.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-[#0F0F0F] mb-1">Create your account</h1>
      <p className="text-sm text-[#737373] mb-8">
        Already have one?{" "}
        <Link to="/login" className="text-[#0F0F0F] font-medium underline underline-offset-2">
          Sign in
        </Link>
      </p>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogle}
        className="w-full h-11 flex items-center justify-center gap-3 rounded-xl border border-[#D4D4D4] bg-white text-sm font-medium text-[#404040] hover:bg-[#F5F3EE] transition-colors mb-6"
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
          <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-[#E8E5DF]"/>
        <span className="text-xs text-[#737373]">or</span>
        <div className="flex-1 h-px bg-[#E8E5DF]"/>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">
            Work email
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

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full h-11 px-3.5 rounded-xl border border-[#D4D4D4] bg-white text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading && (
            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>
          )}
          Create account
        </button>
      </form>

      <p className="mt-6 text-xs text-[#A0A0A0] text-center">
        By signing up you agree to our{" "}
        <a href="#" className="underline">Terms</a>{" "}
        and{" "}
        <a href="#" className="underline">Privacy Policy</a>.
      </p>
    </>
  );
}
