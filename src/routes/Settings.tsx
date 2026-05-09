import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile, getUsage, getPlans, deleteAccount, cancelSubscription } from "@/lib/api";
import { clearAuthCache } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import type { SubscriptionPlan } from "@/types";

export default function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile, staleTime: 60_000 });
  const usageQuery = useQuery({ queryKey: ["usage"], queryFn: getUsage, staleTime: 0, refetchOnWindowFocus: true });
  const plansQuery = useQuery({ queryKey: ["plans"], queryFn: getPlans, staleTime: Infinity });

  const profile = profileQuery.data;
  const usage = usageQuery.data;
  const plans = plansQuery.data ?? [];
  // Only block on profile — it drives the form fields. Usage and plans render
  // their own progressive loading state, so they shouldn't gate the whole page.
  const loading = profileQuery.isLoading;
  const loadError =
    profileQuery.error instanceof Error ? profileQuery.error.message :
    usageQuery.error instanceof Error ? usageQuery.error.message :
    plansQuery.error instanceof Error ? plansQuery.error.message :
    null;

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editable fields — synced from cached profile on first load.
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [fieldsHydrated, setFieldsHydrated] = useState(false);

  useEffect(() => {
    if (profile && !fieldsHydrated) {
      setName(profile.full_name ?? "");
      setCompany(profile.company_name ?? "");
      setFieldsHydrated(true);
    }
  }, [profile, fieldsHydrated]);

  // Cancel subscription state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const updated = await updateProfile({
        full_name: name.trim() || undefined,
        company_name: company.trim() || undefined,
      });
      queryClient.setQueryData(["profile"], updated);
      setName(updated.full_name ?? "");
      setCompany(updated.company_name ?? "");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelSubscription() {
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelSubscription();
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["usage"] });
      setShowCancelConfirm(false);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Could not cancel subscription. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setSaveError(null);
    try {
      await deleteAccount();
      clearAuthCache();
      const supabase = createClient();
      await supabase.auth.signOut();
      navigate({ to: "/login" });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Delete failed. Please try again.");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="h-6 w-6 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin"/>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[#0F0F0F] mb-6">Settings</h1>
        <div className="bg-red-50 rounded-2xl border border-red-200 p-6 flex items-start gap-3">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="mt-0.5 shrink-0">
            <path d="M9 1.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM9 6v3.5M9 11.5h.01" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800 mb-1">Failed to load settings</p>
            <p className="text-xs text-red-600 mb-3">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-medium text-red-700 underline"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const planKey: SubscriptionPlan = profile?.plan ?? "FREE";
  const planInfo = plans.find((p) => p.key === planKey);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[#0F0F0F] mb-8">Settings</h1>

      {saveError && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
            <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 5v3M8 9.5h.01" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {saveError}
        </div>
      )}

      {/* Profile */}
      <div id="profile" className="bg-white rounded-2xl border border-[#E8E5DF] p-6 mb-5 scroll-mt-20">
        <h2 className="text-base font-semibold text-[#0F0F0F] mb-5">Profile</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={profile?.email ?? ""}
              disabled
              className="w-full h-11 px-3.5 rounded-xl border border-[#D4D4D4] bg-[#F5F3EE] text-[#737373] text-sm cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-[#A0A0A0]">Email cannot be changed here.</p>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">
              Full name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full h-11 px-3.5 rounded-xl border border-[#D4D4D4] bg-[#F5F3EE] text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow"
            />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">
              Company
            </label>
            <input
              id="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Corp"
              className="w-full h-11 px-3.5 rounded-xl border border-[#D4D4D4] bg-[#F5F3EE] text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-5 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 transition-colors flex items-center gap-2"
            >
              {saving && (
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>
              )}
              {saving ? "Saving…" : "Save changes"}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-700 font-medium">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8.5l3 3 7-7" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Changes saved
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Plan & Usage */}
      <div id="billing" className="bg-white rounded-2xl border border-[#E8E5DF] p-6 mb-5 scroll-mt-20">
        <h2 className="text-base font-semibold text-[#0F0F0F] mb-5">Plan & billing</h2>

        {/* Current plan hero */}
        <div className="bg-[#F5F3EE] rounded-xl p-4 mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#737373] mb-0.5">Current plan</p>
            <p className="text-lg font-bold text-[#0F0F0F]">{planInfo?.display_name ?? planKey}</p>
            <p className="text-sm text-[#737373]">
              {planInfo ? `$${planInfo.price_monthly_usd}/mo` : "—"} · {planInfo ? planInfo.max_resumes_per_month.toLocaleString() : "—"} resumes/month
            </p>
            {profile?.plan !== "FREE" && !showCancelConfirm && (
              <button
                onClick={() => { setCancelError(null); setShowCancelConfirm(true); }}
                className="mt-2 text-xs text-[#737373] hover:text-red-600 underline underline-offset-2 transition-colors"
              >
                Cancel plan
              </button>
            )}
          </div>
          {usage && (
            <div className="text-right min-w-[100px]">
              <p className="text-xs text-[#737373] mb-1">This month</p>
              <p className="text-sm font-semibold text-[#0F0F0F]">{usage.resumes_processed} <span className="font-normal text-[#737373]">/ {usage.quota_limit}</span></p>
              <div className="h-1.5 w-24 bg-[#E8E5DF] rounded-full overflow-hidden mt-1.5 ml-auto">
                <div
                  className={`h-full rounded-full ${usage.quota_limit > 0 && usage.resumes_processed / usage.quota_limit >= 0.9 ? "bg-red-500" : "bg-[#0F0F0F]"}`}
                  style={{ width: `${usage.quota_limit > 0 ? Math.min(100, Math.round((usage.resumes_processed / usage.quota_limit) * 100)) : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Cancel-subscription confirm */}
        {showCancelConfirm && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
            <p className="text-sm font-semibold text-red-900 mb-1">Cancel your {planInfo?.display_name ?? "current"} plan?</p>
            <p className="text-xs text-red-700/90 mb-3">
              You'll be downgraded to the Free plan immediately. Your monthly limit will drop to {plans.find((p) => p.key === "FREE")?.max_resumes_per_month ?? 50} resumes
              for the rest of this month, and you can re-subscribe anytime.
            </p>
            {cancelError && (
              <p className="text-xs text-red-700 mb-3">{cancelError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="h-9 px-4 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center gap-2"
              >
                {cancelling && <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                {cancelling ? "Cancelling…" : "Yes, cancel plan"}
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelling}
                className="h-9 px-4 border border-[#D4D4D4] text-sm font-medium text-[#0F0F0F] rounded-xl hover:bg-white transition-colors disabled:opacity-60"
              >
                Keep plan
              </button>
            </div>
          </div>
        )}

        {/* Upgrade entry point — actual plan selection lives on /upgrade */}
        <Link
          to="/upgrade"
          className="inline-flex items-center gap-1.5 h-10 px-4 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] transition-colors"
        >
          {profile?.plan === "FREE" ? "Upgrade plan" : "Change plan"}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 3l4 4-4 4"/>
          </svg>
        </Link>
      </div>

      {/* Password */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6 mb-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#0F0F0F] mb-0.5">Password</h2>
            <p className="text-sm text-[#737373]">Change your account password.</p>
          </div>
          <Link
            to="/settings/password"
            className="shrink-0 h-9 px-4 border border-[#E8E5DF] text-sm font-medium text-[#0F0F0F] rounded-xl hover:bg-[#F5F3EE] transition-colors flex items-center gap-1.5"
          >
            Change password
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3l4 4-4 4"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl border border-red-100 p-6">
        <h2 className="text-base font-semibold text-[#0F0F0F] mb-1">Danger zone</h2>
        <p className="text-sm text-[#737373] mb-4">
          Deleting your account is permanent and will remove all your screenings and data.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="h-9 px-4 border border-red-200 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors"
          >
            Delete account
          </button>
        ) : (
          <div className="p-4 bg-red-50 rounded-xl border border-red-200">
            <p className="text-sm font-medium text-red-700 mb-3">
              Are you sure? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="h-8 px-3 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center gap-1.5"
              >
                {deleting && (
                  <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin"/>
                )}
                {deleting ? "Deleting…" : "Yes, delete my account"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="h-8 px-3 border border-red-200 text-xs font-medium text-red-700 rounded-lg hover:bg-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
