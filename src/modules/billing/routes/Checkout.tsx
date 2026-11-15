import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile } from "@/lib/api";
import { useUserKey } from "@/lib/userKey";
import type { SubscriptionPlan } from "@/types";
import { userSubscriptionQueryKey, UserUsageQuotasQueryKey } from "@/modules/shared/queryKeys/subscriptionQueryKeys"
import { useBilling } from "@/modules/billing/useBilling";
import type { CheckoutQuoteResponse } from "@/types/planCheckout.type";
import { getCheckoutQuote, getChangePreview } from "@/modules/billing/billing_apis";
import { getUserSubscription } from "@/modules/subscription/subscription_apis";
import { pollUntilPlanActive, upgradeSummary, type SubscriptionSnapshot } from "@/modules/billing/planChange";
import { formatMoney } from "@/lib/currency";
import type { ChangePreview } from "@/types/subscription.type";

type UpgradePlanSlug = "lite" | "pro" | "plus" | "enterprise";
const VALID_PLANS: UpgradePlanSlug[] = ["lite", "pro", "plus", "enterprise"];

// How long the "You're on {Plan}" confirmation stays up before navigating on.
const SETTLED_NOTICE_MS = 1500;

type Settling = { phase: "waiting" } | { phase: "done"; message: string };

function slugToPlanKey(slug: UpgradePlanSlug): SubscriptionPlan {
  if (slug === "lite") return "LITE";
  if (slug === "pro") return "PRO";
  if (slug === "plus") return "PLUS";
  return "ENTERPRISE";
}

export default function Checkout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { plan: rawPlan } = useParams({ strict: false }) as { plan?: string };
  const search = useSearch({ strict: false }) as { cycle?: "monthly" | "yearly"; from?: string };

  const planSlug = useMemo<UpgradePlanSlug | null>(() => {
    return VALID_PLANS.includes(rawPlan as UpgradePlanSlug) ? (rawPlan as UpgradePlanSlug) : null;
  }, [rawPlan]);

  const [agreed, setAgreed] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [settling, setSettling] = useState<Settling | null>(null);

  const cycle: "monthly" | "yearly" = search.cycle === "yearly" ? "yearly" : "monthly";

  // Aborted on unmount so a slow poll cannot set state or navigate afterwards.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!planSlug) navigate({ to: "/upgrade" });
  }, [planSlug, navigate]);

  // ── Profile ──
  const profileQuery = useQuery({
    queryKey: useUserKey("profile"),
    queryFn: getProfile,
    staleTime: 60_000,
  });

  // ── Checkout quote (includes plan display details + pricing + gateway) ──
  const quoteQuery = useQuery<CheckoutQuoteResponse>({
    queryKey: ["checkout-quote", planSlug, cycle],
    queryFn: () => getCheckoutQuote(slugToPlanKey(planSlug!) as any, cycle),
    enabled: !!planSlug && planSlug !== "enterprise",
    staleTime: 1000 * 60,
  });

  // ── Change preview (what the server will charge and grant; also the block reasons) ──
  const previewQuery = useQuery<ChangePreview>({
    queryKey: ["change-preview", planSlug, cycle],
    queryFn: () => getChangePreview(slugToPlanKey(planSlug!), cycle),
    enabled: !!planSlug && planSlug !== "enterprise",
    staleTime: 0,
    // A refetch after payment would see the new plan and report "already on plan".
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // ── Pre-payment subscription: the poll waits for something other than this row ──
  const subscriptionQuery = useQuery({
    queryKey: [userSubscriptionQueryKey],
    queryFn: getUserSubscription,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  // Frozen at first load: later fetches (the poll writes this cache) must not move it.
  const snapshotRef = useRef<SubscriptionSnapshot | undefined>(undefined);
  if (snapshotRef.current === undefined && subscriptionQuery.isSuccess) {
    const sub = subscriptionQuery.data;
    snapshotRef.current = sub ? { sub_id: sub.sub_id, subscription_ends_at: sub.subscription_ends_at } : null;
  }

  const profile = profileQuery.data;
  const quote = quoteQuery.data;
  const preview = previewQuery.data;
  const loading =
    profileQuery.isLoading ||
    subscriptionQuery.isLoading ||
    quoteQuery.isLoading ||
    previewQuery.isLoading ||
    (!quote && planSlug !== "enterprise" && !quoteQuery.isError) ||
    (!preview && planSlug !== "enterprise" && !previewQuery.isError);
  const loadError =
    profileQuery.error instanceof Error ? profileQuery.error.message :
      quoteQuery.error instanceof Error ? quoteQuery.error.message :
        previewQuery.error instanceof Error ? previewQuery.error.message :
          null;

  // The server classifies the change; an upgrade or a new purchase always goes through
  // the upgrade checkout, even when the plan name matches (e.g. monthly to yearly, or grace).
  const isPlanChange = preview?.change_type === "upgrade" || preview?.change_type === "new";
  const checkoutAction = isPlanChange ? "upgrade" : (quote?.actionable ?? "upgrade");

  // The plan switches when the provider webhook lands, a moment after payment.
  // Resolves false when the page was left meanwhile; callers must then do nothing.
  async function waitForNewPlan(): Promise<boolean> {
    const signal = abortRef.current?.signal;
    if (!planSlug || !preview || !signal) return true;
    const planKey = slugToPlanKey(planSlug);
    setSettling({ phase: "waiting" });
    const active = await pollUntilPlanActive(
      () => queryClient.fetchQuery({ queryKey: [userSubscriptionQueryKey], queryFn: getUserSubscription, staleTime: 0 }),
      { plan: planKey, billing_interval: cycle },
      snapshotRef.current ?? null,
      { signal },
    );
    if (signal.aborted) return false;
    const message = active
      ? `You're on ${quote?.display_name ?? planKey}. ${preview.credits_now.toLocaleString()} credits are ready.`
      : "Payment received. Your plan will update in a minute.";
    setSettling({ phase: "done", message });
    await new Promise((resolve) => setTimeout(resolve, SETTLED_NOTICE_MS));
    return !signal.aborted;
  }

  async function finishUpgrade() {
    if (!(await waitForNewPlan())) return;

    try {
      // Refresh caches so dashboard / settings / sidebar show new plan immediately.
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["usage"] }),
        queryClient.invalidateQueries({ queryKey: [userSubscriptionQueryKey] }),
        queryClient.invalidateQueries({ queryKey: [UserUsageQuotasQueryKey] })
      ]);
    } catch (e) {
      console.warn("Failed to invalidate queries:", e);
    }

    if (profile && !profile.onboarding_completed) {
      try {
        await navigate({ to: "/onboarding" });
      } catch {
        window.location.href = "/onboarding";
      }
    } else {
      try {
        await navigate({ to: "/dashboard" });
      } catch {
        window.location.href = "/dashboard";
      }
    }
  }

  const { subscribe, PaymentUI } = useBilling({
    paymentGateway: quote?.gateway ?? "paypal",
    plan: planSlug && planSlug !== "enterprise" ? (slugToPlanKey(planSlug) as "PRO" | "PLUS" | "LITE") : "PRO",
    action: checkoutAction,
    billingInterval: cycle,
    onSuccess: finishUpgrade,
    onError: (err) => setPaymentError(err || "Payment failed"),
    onCancel: () => setPaymentError(null),
    onProcessing: setPaying,
  });

  // ── Early returns ──

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-96 gap-3">
        <div className="h-6 w-6 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin" />
        <p className="text-xs text-[#737373]">Loading checkout details…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[#0F0F0F] mb-4">Checkout unavailable</h1>
        <p className="text-sm text-red-700">{loadError}</p>
        <Link to="/upgrade" className="inline-block mt-4 text-sm font-medium underline">
          Back to plans
        </Link>
      </div>
    );
  }

  if (!planSlug) {
    return null;
  }

  if (planSlug === "enterprise") {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[#0F0F0F] mb-3">Let's talk</h1>
        <p className="text-sm text-[#737373] mb-6">
          Enterprise plans are tailored to your team's needs. Reach out and we'll set up a call.
        </p>
        <a
          href="/contact"
          className="inline-flex h-11 px-5 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] items-center"
        >
          Contact sales
        </a>
      </div>
    );
  }


  if (!quote || !preview) return null;

  const blockedMessage = settling ? null : preview.blocked_message;

  // ── Pricing derivation ──
  const monthlyAmount =
    (cycle === "yearly" ? (quote.yearly_price_monthly_usd ?? quote.price_monthly_usd) : quote.price_monthly_usd);

  const monthlyLabel = Number.isInteger(monthlyAmount)
    ? `$${monthlyAmount}`
    : `$${monthlyAmount.toFixed(2)}`;

  const totalLabel = formatMoney(Number(preview.charge_today.amount_major), preview.charge_today.currency);

  const fromPricing = search.from === "pricing";
  const backTo = fromPricing ? "/dashboard" : "/upgrade";
  const backLabel = fromPricing ? "Back to dashboard" : "Back to plans";

  return (
    <div className="min-h-screen bg-[#F5F3EE] py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <Link
          to={backTo}
          className="inline-flex items-center gap-1.5 text-sm text-[#737373] hover:text-[#0F0F0F] mb-6"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3l-4 4 4 4" />
          </svg>
          {backLabel}
        </Link>

        <h1 className="text-3xl font-bold text-[#0F0F0F] mb-2">Complete your {preview.change_type === "already_on_plan" ? "Renewal" : "Upgrade"}</h1>
        <p className="text-sm text-[#737373] mb-8">
          {blockedMessage
            ? `${quote.display_name} plan`
            : preview.change_type === "upgrade"
              ? upgradeSummary(preview, quote.display_name)
              : `You're upgrading to the ${quote.display_name} plan.`}
        </p>

        {blockedMessage && (
          <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {blockedMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Order summary */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E8E5DF] p-6">
            <h2 className="text-base font-semibold text-[#0F0F0F] mb-5">Order summary</h2>

            <div className="bg-[#F5F3EE] rounded-xl p-5 mb-5">
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-lg font-bold text-[#0F0F0F]">{quote.display_name}</p>
                <p className="text-2xl font-extrabold text-[#0F0F0F]">{monthlyLabel}<span className="text-sm font-normal text-[#737373]">/mo</span></p>
              </div>
              <p className="text-xs text-[#737373]">
                {quote.max_resumes_per_month.toLocaleString()} resume analyses
                {quote.quota_period === "monthly" ? "/month" : " total"} · billed {cycle}
              </p>
              {quote.currency !== "USD" && quote.fx_rate && (
                <p className="text-[11px] text-[#A0A0A0] mt-2">
                  Billed in {quote.currency} at today's rate: {formatMoney(quote.usd_amount, "USD")} = {formatMoney(quote.amount_major, quote.currency)}
                  {" "}(1 USD = {quote.currency} {quote.fx_rate.toFixed(2)})
                </p>
              )}
            </div>

            <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide mb-3">
              What's included
            </p>
            <ul className="space-y-2.5 mb-2">
              {quote.display_features.map((feat) => (
                <li key={feat} className="flex items-start gap-2 text-sm text-[#0F0F0F]">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                    <path d="M3 8.5l3 3 7-7" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span dangerouslySetInnerHTML={{ __html: feat.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[#0F0F0F]">$1</strong>') }} />
                </li>
              ))}
            </ul>
          </div>

          {/* Pay panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6 sticky top-6">
              <h2 className="text-base font-semibold text-[#0F0F0F] mb-5">Payment</h2>

              <div className="mb-5">
                <p className="text-xs text-[#737373] mb-1">Account</p>
                <p className="text-sm text-[#0F0F0F] truncate">{profile?.email}</p>
              </div>

              <div className="border-t border-[#E8E5DF] pt-4 mb-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[#737373]">Subtotal</span>
                  <span className="text-sm text-[#0F0F0F]">{totalLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#0F0F0F]">Total due today</span>
                  <span className="text-lg font-extrabold text-[#0F0F0F]">{totalLabel}</span>
                </div>
              </div>

              <label className="flex items-start gap-2 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#D4D4D4] accent-[#0F0F0F]"
                />
                <span className="text-xs text-[#737373] leading-relaxed">
                  I agree to the{" "}
                  <Link to="/terms" className="underline text-[#0F0F0F]">Terms</Link> and{" "}
                  <Link to="/privacy" className="underline text-[#0F0F0F]">Privacy Policy</Link>.
                </span>
              </label>

              {paymentError && (
                <p className="text-xs text-red-600 mb-3">{paymentError}</p>
              )}

              {blockedMessage ? (
                <Link to={backTo} className="block w-full h-12 leading-[3rem] text-center border border-[#E8E5DF] text-sm font-semibold rounded-xl text-[#0F0F0F]">
                  {backLabel}
                </Link>
              ) : settling ? (
                <p role="status" className="flex items-center justify-center gap-2 text-sm font-medium text-[#0F0F0F] text-center">
                  {settling.phase === "waiting" ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin" />
                      Payment received. Activating your plan…
                    </>
                  ) : settling.message}
                </p>
              ) : PaymentUI ? (
                <PaymentUI />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (paying) return;
                    void subscribe();
                  }}
                  disabled={!agreed || paying}
                  className="w-full h-12 bg-[#0F0F0F] text-white text-sm font-semibold rounded-xl hover:bg-[#1C1C1C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {paying && (
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  )}
                  {paying ? "Processing…" : `Pay ${totalLabel}`}
                </button>
              )}

              <p className="mt-4 text-[11px] text-[#A0A0A0] text-center leading-relaxed">
                Secured checkout · Cards · UPI · Wallets
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
