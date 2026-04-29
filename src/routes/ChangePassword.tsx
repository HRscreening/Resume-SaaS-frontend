import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { getProfile } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";
import { passwordStrength } from "@/lib/passwordValidation";
import type { Profile } from "@/types";

export default function ChangePassword() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    const strength = passwordStrength(newPassword);
    if (!strength.isValid) {
      setPwError("New password does not meet all requirements.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwError("New passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setPwError("New password must be different from your current password.");
      return;
    }
    if (!profile?.email) {
      setPwError("Could not load your account. Please refresh and try again.");
      return;
    }

    setPwSaving(true);
    try {
      const supabase = createClient();
      // Re-verify the current password by attempting a fresh sign-in. Supabase's
      // updateUser does NOT require the current password, so we verify it
      // ourselves to prevent silent password changes from a hijacked session.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword,
      });
      if (signInError) {
        throw new Error("Current password is incorrect.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="h-6 w-6 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin"/>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link
        to="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-[#737373] hover:text-[#0F0F0F] transition-colors mb-4"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11L4 7l5-4"/>
        </svg>
        Back to settings
      </Link>

      <h1 className="text-2xl font-bold text-[#0F0F0F] mb-2">Change password</h1>
      <p className="text-sm text-[#737373] mb-6">
        Enter your current password to confirm it's you, then choose a new one.
      </p>

      {loadError && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {loadError}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
        {pwError && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {pwError}
          </div>
        )}
        {pwSuccess && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7.5l3 3 5-6" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Password updated successfully.
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">
              Current password
            </label>
            <PasswordInput
              id="current-password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Enter current password"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">
              New password
            </label>
            <PasswordInput
              id="new-password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Enter new password"
              showStrength
            />
          </div>

          <div>
            <label htmlFor="confirm-new-password" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">
              Confirm new password
            </label>
            <PasswordInput
              id="confirm-new-password"
              value={confirmNewPassword}
              onChange={setConfirmNewPassword}
              placeholder="Re-enter new password"
            />
            {confirmNewPassword.length > 0 && newPassword !== confirmNewPassword && (
              <p className="text-xs text-red-600 mt-1.5">Passwords don't match</p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={pwSaving || !currentPassword || !newPassword || newPassword !== confirmNewPassword}
              className="h-10 px-5 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 transition-colors flex items-center gap-2"
            >
              {pwSaving && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {pwSaving ? "Updating…" : "Update password"}
            </button>
            <Link
              to="/settings"
              className="h-10 px-5 border border-[#D4D4D4] text-sm font-medium text-[#0F0F0F] rounded-xl hover:bg-[#F5F3EE] transition-colors flex items-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
