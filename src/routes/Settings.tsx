import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getProfile, updateProfile, getUsage, createPortalSession, deleteAccount } from "@/lib/api";
import { clearAuthCache } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UsageResponse } from "@/types";

const PLAN_DETAILS = {
  FREE: { name: "Free", price: "$0/mo", resumes: 50 },
  PRO: { name: "Pro", price: "$29/mo", resumes: 500 },
  BUSINESS: { name: "Business", price: "$99/mo", resumes: 2000 },
  ENTERPRISE: { name: "Enterprise", price: "Custom", resumes: Infinity },
};

export default function Settings() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");

  useEffect(() => {
    Promise.all([getProfile(), getUsage()])
      .then(([p, u]) => {
        setProfile(p);
        setUsage(u);
        setName(p.full_name ?? "");
        setCompany(p.company_name ?? "");
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load profile. Please refresh.");
      })
      .finally(() => setLoading(false));
  }, []);

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
      setProfile(updated);
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

  async function handleManageBilling() {
    setSaveError(null);
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch {
      setSaveError("Could not open billing portal. Please try again.");
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

  const planKey = (profile?.plan ?? "FREE") as keyof typeof PLAN_DETAILS;
  const planInfo = PLAN_DETAILS[planKey];

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
      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6 mb-5">
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
              {saving ? "Saving\u2026" : "Save changes"}
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
      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6 mb-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#0F0F0F]">Plan & billing</h2>
          <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-[#F5F3EE] border border-[#D4D4D4] text-[#404040]">
            {planInfo.name}
          </span>
        </div>

        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-2xl font-bold text-[#0F0F0F]">{planInfo.price}</span>
        </div>
        <p className="text-sm text-[#737373] mb-5">
          {planInfo.resumes === Infinity ? "Unlimited" : planInfo.resumes.toLocaleString()} resumes/month
        </p>

        {usage && (
          <div className="mb-5">
            <div className="flex items-center justify-between text-xs text-[#737373] mb-1.5">
              <span>Monthly usage</span>
              <span>{usage.resumes_processed} / {usage.quota_limit}</span>
            </div>
            <div className="h-2 w-full bg-[#E8E5DF] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usage.quota_limit > 0 && usage.resumes_processed / usage.quota_limit >= 0.9
                    ? "bg-red-500"
                    : "bg-[#0F0F0F]"
                }`}
                style={{
                  width: `${usage.quota_limit > 0 ? Math.min(100, Math.round((usage.resumes_processed / usage.quota_limit) * 100)) : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {profile?.plan !== "FREE" && (
            <button
              onClick={handleManageBilling}
              className="h-9 px-4 border border-[#D4D4D4] text-sm font-medium text-[#404040] rounded-xl hover:bg-[#F5F3EE] transition-colors"
            >
              Manage billing
            </button>
          )}
          {profile?.plan === "FREE" && (
            <a
              href="/settings?upgrade=1"
              className="h-9 px-4 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] transition-colors inline-flex items-center"
            >
              Upgrade to Pro
            </a>
          )}
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
                {deleting ? "Deleting\u2026" : "Yes, delete my account"}
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
