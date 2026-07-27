import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, getUsage, getPlans, deleteAccount, cancelSubscription } from "@/lib/api";
import { clearAuthCache } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { useUserKey } from "@/lib/userKey";
import { cn } from "@/lib/utils";
import type { SubscriptionPlan } from "@/types";


type TabKey = "general" | "account" | "privacy" | "billing" | "capabilities" | "connectors";

const TABS: { key: TabKey; label: string }[] = [
  // { key: "general", label: "General" },
  { key: "account", label: "Account" },
  // { key: "privacy", label: "Privacy" },
  { key: "billing", label: "Billing" },
  // { key: "capabilities", label: "Capabilities" },
  // { key: "connectors", label: "Connectors" },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabKey>("account");

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10 max-w-5xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0F0F0F] mb-6 md:mb-10">Settings</h1>

      <div className="flex flex-col md:flex-row gap-6 md:gap-12">
        {/* Sub-nav: horizontal pill row on mobile (scrolls if labels overflow);
            vertical list at md+. Same buttons, same handlers — only the
            wrapper layout changes per viewport. */}
        <nav className="md:w-48 md:shrink-0 -mx-4 md:mx-0">
          <ul className="flex md:flex-col gap-1 md:gap-0 md:space-y-1 overflow-x-auto px-4 md:px-0 pb-1 md:pb-0">
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <li key={tab.key} className="shrink-0 md:shrink">
                  <button
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap md:w-full",
                      active
                        ? "bg-[#0F0F0F] text-white"
                        : "text-[#404040] hover:bg-[#EDEAE3]"
                    )}
                  >
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content pane */}
        <div className="flex-1 min-w-0">
          {activeTab === "general" && <ComingSoon title="General" />}
          {activeTab === "account" && <AccountPanel />}
          {activeTab === "privacy" && <ComingSoon title="Privacy" />}
          {activeTab === "billing" && <BillingPanel />}
          {activeTab === "capabilities" && <ComingSoon title="Capabilities" />}
          {activeTab === "connectors" && <ComingSoon title="Connectors" />}
        </div>
      </div>
    </div>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#0F0F0F] mb-6">{title}</h2>
      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6 sm:p-8 md:p-10 flex flex-col items-center text-center">
        <div className="h-12 w-12 rounded-full bg-[#F5F3EE] flex items-center justify-center mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </div>
        <p className="text-base font-semibold text-[#0F0F0F] mb-1">Coming soon</p>
        <p className="text-sm text-[#737373] max-w-sm">
          We're working on {title.toLowerCase()} settings. Check back here once it's available.
        </p>
      </div>
    </div>
  );
}

function AccountPanel() {
  const navigate = useNavigate();
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile, staleTime: 60_000 });
  const profile = profileQuery.data;

  const [loggingOut, setLoggingOut] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [hideChangePassword, setHideChangePassword] = useState(true);

  async function checkGoogleUser() {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();


    const isGoogleUser =
      data.user?.app_metadata?.provider === "google";

    setHideChangePassword(isGoogleUser);
  }

  useEffect(() => {
    checkGoogleUser();

  }, [])

  async function handleLogout() {
    setLoggingOut(true);
    clearAuthCache();
    const supabase = createClient();
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      clearAuthCache();
      const supabase = createClient();
      await supabase.auth.signOut();
      navigate({ to: "/login" });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed. Please try again.");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-[#0F0F0F] mb-6">Account</h2>

      <div className="bg-white rounded-2xl border border-[#E8E5DF] divide-y divide-[#E8E5DF]">
        {/* Log out */}
        <Row
          label="Log out of all devices"
          action={
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="h-9 px-4 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 transition-colors"
            >
              {loggingOut ? "Logging out…" : "Log out"}
            </button>
          }
        />

        {/* Change password */}
        {hideChangePassword &&
          <Row
            label="Change password"
            action={
              <Link
                to="/settings/password"
                className="h-9 px-4 border border-[#E8E5DF] text-sm font-medium text-[#0F0F0F] rounded-xl hover:bg-[#F5F3EE] transition-colors inline-flex items-center"
              >
                Change password
              </Link>
            }
          />
        }

        {/* Delete account */}
        <Row
          label="Delete your account"
          action={
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="h-9 px-4 border border-red-200 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors"
            >
              Delete account
            </button>
          }
        />

        {/* Organization / user ID */}
        {profile?.id && (
          <Row
            label="User ID"
            action={
              <code className="px-2.5 py-1.5 rounded-md bg-[#F5F3EE] text-xs text-[#737373] font-mono">
                {profile.id}
              </code>
            }
          />
        )}
      </div>

      {showDeleteConfirm && (
        <div className="mt-5 bg-red-50 border border-red-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-red-900 mb-1">Delete your account?</p>
          <p className="text-xs text-red-700/90 mb-3">
            This is permanent and will remove all your screenings and data.
          </p>
          {deleteError && <p className="text-xs text-red-700 mb-3">{deleteError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="h-9 px-4 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center gap-2"
            >
              {deleting && <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {deleting ? "Deleting…" : "Yes, delete my account"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
              className="h-9 px-4 border border-red-200 text-sm font-medium text-red-700 rounded-xl hover:bg-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, action }: { label: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <p className="text-sm font-medium text-[#0F0F0F]">{label}</p>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function BillingPanel() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: useUserKey("profile"), queryFn: getProfile, staleTime: 60_000 });
  const usageQuery = useQuery({ queryKey: useUserKey("usage"), queryFn: getUsage, staleTime: 30_000 });
  // Plans are public catalog data — not user-scoped. Keep the global key.
  const plansQuery = useQuery({ queryKey: ["plans"], queryFn: getPlans, staleTime: Infinity });

  const profile = profileQuery.data;
  const usage = usageQuery.data;
  const plans = plansQuery.data ?? [];

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

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

  const planKey: SubscriptionPlan = profile?.plan ?? "FREE";
  const planInfo = plans.find((p) => p.key === planKey);

  return (
    <div>
      <h2 className="text-xl font-bold text-[#0F0F0F] mb-6">Plan & billing</h2>

      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
        {/* Plan summary row — stacks vertically on mobile so the quota line on
            the left isn't squeezed out by the usage block on the right. The
            FREE plan now has a lifetime (one-time) quota, so we suppress the
            "/mo" price and the "/month" suffix for that tier. */}
        <div className="bg-[#F5F3EE] rounded-xl p-4 mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-[#737373] mb-0.5">Current plan</p>
            <p className="text-lg font-bold text-[#0F0F0F]">{planInfo?.display_name ?? planKey}</p>
            <p className="text-sm text-[#737373]">
              {planKey === "FREE"
                ? `Free · ${(usage?.quota_limit ?? planInfo?.max_resumes_per_month ?? 50).toLocaleString()} resumes`
                : `${planInfo ? `$${planInfo.price_monthly_usd}/mo` : "—"} · ${(usage?.quota_limit ?? planInfo?.max_resumes_per_month ?? 0).toLocaleString()} resumes/month`}
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
            <div className="sm:text-right sm:min-w-[100px]">
              <p className="text-xs text-[#737373] mb-1">
                {planKey === "FREE" ? "Free quota used" : "This month"}
              </p>
              <p className="text-sm font-semibold text-[#0F0F0F]">
                {usage.resumes_processed} <span className="font-normal text-[#737373]">/ {usage.quota_limit}</span>
              </p>
              <div className="h-1.5 w-24 bg-[#E8E5DF] rounded-full overflow-hidden mt-1.5 sm:ml-auto">
                <div
                  className={`h-full rounded-full ${usage.quota_limit > 0 && usage.resumes_processed / usage.quota_limit >= 0.9 ? "bg-red-500" : "bg-[#0F0F0F]"}`}
                  style={{ width: `${usage.quota_limit > 0 ? Math.min(100, Math.round((usage.resumes_processed / usage.quota_limit) * 100)) : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {showCancelConfirm && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
            <p className="text-sm font-semibold text-red-900 mb-1">Cancel your {planInfo?.display_name ?? "current"} plan?</p>
            <p className="text-xs text-red-700/90 mb-3">
              You'll be downgraded to the Free plan immediately. Your monthly limit will drop to {plans.find((p) => p.key === "FREE")?.max_resumes_per_month ?? 50} resumes
              for the rest of this month, and you can re-subscribe anytime.
            </p>
            {cancelError && <p className="text-xs text-red-700 mb-3">{cancelError}</p>}
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

        <Link
          to="/upgrade"
          className="inline-flex items-center gap-1.5 h-10 px-4 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] transition-colors"
        >
          {profile?.plan === "FREE" ? "Upgrade plan" : "Change plan"}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 3l4 4-4 4" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
