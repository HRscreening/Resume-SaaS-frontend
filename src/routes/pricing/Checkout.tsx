import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, getPlans, getFxRate } from "@/lib/api";
import { openRazorpayCheckout, type UpgradePlanSlug } from "@/lib/razorpay";
import type { PlanSpec, SubscriptionPlan } from "@/types";

const VALID_PLANS: UpgradePlanSlug[] = ["pro", "plus", "enterprise"];

function slugToPlanKey(slug: UpgradePlanSlug): SubscriptionPlan {
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
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (!planSlug) navigate({ to: "/upgrade" });
  }, [planSlug, navigate]);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    staleTime: 60_000,
  });
  const plansQuery = useQuery({
    queryKey: ["plans"],
    queryFn: getPlans,
    staleTime: 1000*60*60*24,
  });
  const fxQuery = useQuery({
    queryKey: ["fx-rate"],
    queryFn: getFxRate,
    staleTime: 1000 * 60, //  refresh every 1 min since FX rates can fluctuate often
  });

  const profile = profileQuery.data;
  const plans = plansQuery.data ?? [];
  const fx = fxQuery.data;
  const loading = profileQuery.isLoading || plansQuery.isLoading;
  const loadError =
    profileQuery.error instanceof Error ? profileQuery.error.message :
    plansQuery.error instanceof Error ? plansQuery.error.message :
    null;

  const planSpec = useMemo<PlanSpec | undefined>(() => {
    if (!planSlug) return undefined;
    return plans.find((p) => p.key === slugToPlanKey(planSlug));
  }, [plans, planSlug]);

  const isAlreadyOnPlan = profile && planSlug && profile.plan === slugToPlanKey(planSlug);

  async function handlePay() {
    if (!profile || !planSlug) return;
    setPaying(true);
    setPaymentError(null);
    try {
      await openRazorpayCheckout({
        plan: planSlug,
        cycle: search.cycle || "monthly",
        profile,
        onStatusChange: setPaymentStatus,
      });
      // Refresh caches so dashboard / settings / sidebar show new plan immediately.
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["usage"] });
      // If the user signed up via the marketing → checkout flow, they paid
      // before onboarding. Send them through onboarding now; otherwise go
      // straight to the dashboard with the upgraded banner.
      if (profile && !profile.onboarding_completed) {
        navigate({ to: "/onboarding" });
      } else {
        navigate({ to: "/dashboard", search: { upgraded: planSlug } as any });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      if (msg !== "cancelled") setPaymentError(msg);
    } finally {
      setPaying(false);
      setPaymentStatus(null);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="h-6 w-6 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin" />
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

  if (!planSlug || !planSpec) {
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

  if (isAlreadyOnPlan) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[#0F0F0F] mb-3">You're already on this plan</h1>
        <p className="text-sm text-[#737373] mb-6">
          You're already subscribed to the {planSpec.display_name} plan. You can manage your
          subscription from settings.
        </p>
        <Link
          to="/settings"
          className="inline-flex h-11 px-5 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] items-center"
        >
          Go to settings
        </Link>
      </div>
    );
  }

  const cycle = search.cycle === "yearly" ? "yearly" : "monthly";
  const monthlyAmount = cycle === "yearly" ? planSpec.yearly_price_monthly_usd : planSpec.price_monthly_usd;
  const totalUsd = cycle === "yearly" ? monthlyAmount * 12 : monthlyAmount;

  const showLocal = !!fx && fx.currency !== "USD";
  const localCurrency = fx?.currency ?? "USD";
  const fmtLocal = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: localCurrency,
      maximumFractionDigits: 2,
    }).format(n);

  const monthlyLocal = fx ? monthlyAmount * fx.rate : monthlyAmount;
  const totalLocal = fx ? totalUsd * fx.rate : totalUsd;

  const monthlyLabel = showLocal ? fmtLocal(monthlyLocal) : `$${monthlyAmount}`;
  const subtotalLabel = showLocal ? fmtLocal(totalLocal) : `$${totalUsd.toFixed(2)}`;
  const totalLabel = subtotalLabel;

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

        <h1 className="text-3xl font-bold text-[#0F0F0F] mb-2">Complete your upgrade</h1>
        <p className="text-sm text-[#737373] mb-8">
          You're upgrading to the {planSpec.display_name} plan.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Order summary */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E8E5DF] p-6">
            <h2 className="text-base font-semibold text-[#0F0F0F] mb-5">Order summary</h2>

            <div className="bg-[#F5F3EE] rounded-xl p-5 mb-5">
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-lg font-bold text-[#0F0F0F]">{planSpec.display_name}</p>
                <p className="text-2xl font-extrabold text-[#0F0F0F]">{monthlyLabel}<span className="text-sm font-normal text-[#737373]">/mo</span></p>
              </div>
              <p className="text-xs text-[#737373]">
                {planSpec.max_resumes_per_month.toLocaleString()} resumes/month · billed {cycle}
              </p>
              {/* {showLocal && (
                <p className="text-[11px] text-[#A0A0A0] mt-2">
                  Converted from ${monthlyAmount}/mo at 1 USD = {fx!.rate.toFixed(4)} {localCurrency}
                  {fx!.fallback ? " (estimated rate)" : ""}
                </p>
              )} */}
            </div>

            <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide mb-3">
              What's included
            </p>
            <ul className="space-y-2.5 mb-2">
              {planSpec.display_features.map((feat) => (
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

              {paymentStatus && (
                <p className="text-xs text-[#737373] mb-3">{paymentStatus}</p>
              )}
              {paymentError && (
                <p className="text-xs text-red-600 mb-3">{paymentError}</p>
              )}

              <button
                onClick={handlePay}
                disabled={!agreed || paying}
                className="w-full h-12 bg-[#0F0F0F] text-white text-sm font-semibold rounded-xl hover:bg-[#1C1C1C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {paying && (
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                )}
                {paying ? "Processing…" : `Pay ${totalLabel}`}
              </button>

              <p className="mt-4 text-[11px] text-[#A0A0A0] text-center leading-relaxed">
                Secured by Razorpay · UPI · Cards · Netbanking · Wallets
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
