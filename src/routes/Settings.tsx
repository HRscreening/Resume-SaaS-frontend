import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getProfile, updateProfile, getUsage, createPortalSession, deleteAccount } from "@/lib/api";
import { clearAuthCache } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Profile, UsageResponse } from "@/types";

type Section = "profile" | "billing";

const PLAN_DETAILS = {
  FREE:       { name: "Free",       price: "$0/mo",     resumes: 50,       color: "text-[#737373] bg-[#F5F3EE] border-[#D4D4D4]" },
  PRO:        { name: "Pro",        price: "$29/mo",    resumes: 500,      color: "text-amber-700 bg-amber-50 border-amber-200" },
  BUSINESS:   { name: "Business",   price: "$99/mo",    resumes: 2000,     color: "text-purple-700 bg-purple-50 border-purple-200" },
  ENTERPRISE: { name: "Enterprise", price: "Custom",    resumes: Infinity, color: "text-blue-700 bg-blue-50 border-blue-200" },
};

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

export default function Settings() {
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("profile");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
        setLoadError(err instanceof Error ? err.message : "Failed to load profile.");
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

  async function handleLogout() {
    setLoggingOut(true);
    clearAuthCache();
    const supabase = createClient();
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-96">
        <div className="h-6 w-6 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-red-50 rounded-2xl border border-red-200 p-6 flex items-start gap-3">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="mt-0.5 shrink-0">
            <path d="M9 1.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM9 6v3.5M9 11.5h.01" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800 mb-1">Failed to load settings</p>
            <p className="text-xs text-red-600 mb-3">{loadError}</p>
            <button onClick={() => window.location.reload()} className="text-xs font-medium text-red-700 underline">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  const planKey = (profile?.plan ?? "FREE") as keyof typeof PLAN_DETAILS;
  const planInfo = PLAN_DETAILS[planKey];
  const initials = getInitials(profile?.full_name, profile?.email);
  const usagePct = usage && usage.quota_limit > 0
    ? Math.min(100, Math.round((usage.resumes_processed / usage.quota_limit) * 100))
    : 0;

  return (
    <div className="flex min-h-screen">

      {/* ── Settings sidebar ─────────────────────────────── */}
      <aside className="w-[220px] shrink-0 bg-white border-r border-[#E8E5DF] flex flex-col">

        {/* Avatar block */}
        <div className="px-4 pt-6 pb-5">
          <div className="h-10 w-10 rounded-full bg-[#C85A17] flex items-center justify-center mb-3">
            <span className="text-white text-sm font-semibold leading-none">{initials}</span>
          </div>
          <p className="text-sm font-semibold text-[#0F0F0F] truncate leading-tight">
            {profile?.full_name ?? profile?.email ?? "—"}
          </p>
          <p className="text-xs text-[#737373] truncate mt-0.5">{profile?.email ?? "—"}</p>
          <span className={cn(
            "inline-flex items-center mt-2.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold tracking-wide",
            planInfo.color,
          )}>
            {planInfo.name}
          </span>
        </div>

        <div className="mx-4 border-t border-[#E8E5DF]" />

        {/* Nav */}
        <nav className="flex-1 px-3 pt-4 space-y-4">
          {/* Account group */}
          <div>
            <p className="px-3 mb-1 text-[10px] font-semibold text-[#A0A0A0] uppercase tracking-widest">Account</p>
            <NavItem label="Profile" active={section === "profile"} onClick={() => setSection("profile")} />
          </div>

          {/* Billing group */}
          <div>
            <p className="px-3 mb-1 text-[10px] font-semibold text-[#A0A0A0] uppercase tracking-widest">Billing</p>
            <NavItem label="Plan & Usage" active={section === "billing"} onClick={() => setSection("billing")} />
          </div>
        </nav>

        {/* Bottom — sign out */}
        <div className="mx-4 border-t border-[#E8E5DF]" />
        <div className="px-3 py-3">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#737373] hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M11 11l3-3-3-3M14 8H6" />
            </svg>
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {/* ── Content ──────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-8">

          {saveError && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 5v3M8 9.5h.01" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {saveError}
            </div>
          )}

          {/* ── Profile section ── */}
          {section === "profile" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-[#0F0F0F]">Profile</h1>
                <p className="text-sm text-[#737373] mt-0.5">Manage your personal information.</p>
              </div>

              <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">Email</label>
                    <input
                      id="email" type="email" value={profile?.email ?? ""} disabled
                      className="w-full h-11 px-3.5 rounded-xl border border-[#D4D4D4] bg-[#F5F3EE] text-[#737373] text-sm cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-[#A0A0A0]">Email cannot be changed here.</p>
                  </div>

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">Full name</label>
                    <input
                      id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Smith"
                      className="w-full h-11 px-3.5 rounded-xl border border-[#D4D4D4] bg-[#F5F3EE] text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow"
                    />
                  </div>

                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">Company</label>
                    <input
                      id="company" type="text" value={company} onChange={(e) => setCompany(e.target.value)}
                      placeholder="Acme Corp"
                      className="w-full h-11 px-3.5 rounded-xl border border-[#D4D4D4] bg-[#F5F3EE] text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="submit" disabled={saving}
                      className="h-10 px-5 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 transition-colors flex items-center gap-2"
                    >
                      {saving && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                    {saved && (
                      <span className="flex items-center gap-1.5 text-sm text-green-700 font-medium">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8.5l3 3 7-7" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Saved
                      </span>
                    )}
                  </div>
                </form>
              </div>

              {/* Danger zone */}
              <div className="bg-white rounded-2xl border border-red-100 p-6">
                <h2 className="text-sm font-semibold text-[#0F0F0F] mb-1">Danger zone</h2>
                <p className="text-sm text-[#737373] mb-4">
                  Deleting your account is permanent and removes all screenings and data.
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
                    <p className="text-sm font-medium text-red-700 mb-3">Are you sure? This cannot be undone.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteAccount} disabled={deleting}
                        className="h-8 px-3 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center gap-1.5"
                      >
                        {deleting && <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                        {deleting ? "Deleting…" : "Yes, delete my account"}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)} disabled={deleting}
                        className="h-8 px-3 border border-red-200 text-xs font-medium text-red-700 rounded-lg hover:bg-white transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Billing section ── */}
          {section === "billing" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-[#0F0F0F]">Plan & Usage</h1>
                <p className="text-sm text-[#737373] mt-0.5">Your current plan and monthly usage.</p>
              </div>

              <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
                {/* Plan header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide mb-1">Current plan</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[#0F0F0F]">{planInfo.price}</span>
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md border", planInfo.color)}>
                        {planInfo.name}
                      </span>
                    </div>
                    <p className="text-sm text-[#737373] mt-1">
                      {planInfo.resumes === Infinity ? "Unlimited" : planInfo.resumes.toLocaleString()} resumes / month
                    </p>
                  </div>
                </div>

                {/* Usage bar */}
                {usage && (
                  <div className="mb-5 p-4 bg-[#F5F3EE] rounded-xl">
                    <div className="flex items-center justify-between text-xs text-[#737373] mb-2">
                      <span className="font-medium text-[#0F0F0F]">Monthly usage</span>
                      <span>{usage.resumes_processed.toLocaleString()} / {usage.quota_limit.toLocaleString()}</span>
                    </div>
                    <div className="h-2 w-full bg-[#E8E5DF] rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${usagePct >= 90 ? "bg-red-500" : "bg-[#0F0F0F]"}`}
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#A0A0A0]">
                      <span>{usagePct}% used</span>
                      <span>{usage.quota_remaining.toLocaleString()} remaining</span>
                    </div>
                    {usagePct >= 90 && (
                      <p className="text-xs text-red-600 font-medium mt-2">
                        You're near your limit. Upgrade to avoid interruptions.
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  {profile?.plan === "FREE" ? (
                    <a
                      href="/settings?upgrade=1"
                      className="h-10 px-5 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] transition-colors inline-flex items-center"
                    >
                      Upgrade to Pro
                    </a>
                  ) : (
                    <button
                      onClick={handleManageBilling}
                      className="h-10 px-5 border border-[#D4D4D4] text-sm font-medium text-[#404040] rounded-xl hover:bg-[#F5F3EE] transition-colors"
                    >
                      Manage billing
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}


// ── Sidebar nav item ──────────────────────────────────────────

function NavItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors",
        active
          ? "bg-[#F0EDE8] text-[#0F0F0F] font-semibold"
          : "font-medium text-[#404040] hover:bg-[#F5F3EE] hover:text-[#0F0F0F]",
      )}
    >
      {label}
    </button>
  );
}
