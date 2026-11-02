import React from "react";
import { Link } from "@tanstack/react-router";
import { useUserSubscription } from "@/modules/subscription/useSubscription";
import { type UserSubscription } from "@/types/subscription.type";
import { cn } from "@/lib/utils";
import {
    CreditCard,
    Calendar,
    Clock,
    ShieldCheck,
    AlertCircle,
    ArrowUpRight,
    Zap,
} from "lucide-react";

function formatDate(isoString: string | null | undefined): string {
    if (!isoString) return "N/A";
    try {
        const d = new Date(isoString);
        if (Number.isNaN(d.getTime())) return "N/A";
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    } catch {
        return "N/A";
    }
}

interface SubscriptionProps {
    className?: string;
    embedded?: boolean;
}

export const Subscription = ({ className, embedded = false }: SubscriptionProps = {}) => {
      const { data: subscription, isLoading, isError } = useUserSubscription();

      if (isLoading) {
        if (embedded) {
          return (
            <div className="p-6 sm:p-7 border-t border-[#E8E5DF] animate-pulse">
              <div className="h-6 bg-[#E8E5DF] rounded-md w-1/3 mb-2" />
              <div className="h-4 bg-[#F5F3EE] rounded-md w-1/2 mb-6" />
              <div className="h-20 bg-[#F9F8F6] rounded-xl border border-[#E8E5DF] mb-5" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="h-20 bg-[#F5F3EE] rounded-xl" />
                <div className="h-20 bg-[#F5F3EE] rounded-xl" />
                <div className="h-20 bg-[#F5F3EE] rounded-xl" />
                <div className="h-20 bg-[#F5F3EE] rounded-xl" />
              </div>
            </div>
          );
        }
        return (
          <div className={cn("bg-white rounded-2xl border border-[#E8E5DF] p-6 sm:p-7 shadow-xs animate-pulse flex flex-col justify-between h-full", className)}>
            <div>
              <div className="h-6 bg-[#E8E5DF] rounded-md w-1/3 mb-2" />
              <div className="h-4 bg-[#F5F3EE] rounded-md w-1/2 mb-6" />
              <div className="h-20 bg-[#F9F8F6] rounded-xl border border-[#E8E5DF] mb-5" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="h-20 bg-[#F5F3EE] rounded-xl" />
                <div className="h-20 bg-[#F5F3EE] rounded-xl" />
                <div className="h-20 bg-[#F5F3EE] rounded-xl" />
                <div className="h-20 bg-[#F5F3EE] rounded-xl" />
              </div>
            </div>
          </div>
        );
      }

      // If subscription details are null, do not show subscription UI
      if (!subscription || isError) {
        return null;
      }

    const isCancelled = Boolean(subscription.auto_pay_cancelled_at);
    const isGrace = subscription.is_grace_period;
    const isActive = subscription.status?.toLowerCase() === "active";
    const currencyCode = (subscription.credit_unit || subscription.credit_currency || "USD").toUpperCase();
    const currencySymbol = currencyCode === "INR" ? "₹" : "$";

    const containerClasses = embedded
        ? "p-6 sm:p-7 border-t border-[#E8E5DF]"
        : cn("bg-white rounded-2xl border border-[#E8E5DF] p-6 sm:p-7 shadow-xs flex flex-col justify-between h-full", className);

    return (
        <div className={containerClasses}>
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 pb-5 border-b border-[#E8E5DF]">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-base font-semibold text-[#0F0F0F]">Subscription Details</h2>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0F0F0F] text-white">
                                {subscription.plan}
                            </span>
                        </div>
                        <p className="text-xs text-[#737373] mt-1">
                            Current plan, renewal date, and billing interval.
                        </p>
                    </div>

                    <Link
                        to="/upgrade"
                        className="inline-flex items-center gap-1.5 shrink-0 h-8 px-3 text-xs font-medium rounded-xl border border-[#D4D4D4] text-[#0F0F0F] hover:bg-[#F5F3EE] transition-colors"
                    >
                        Change plan
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#737373]" />
                    </Link>
                </div>

                {/* Auto-pay Cancelled Notice */}
                {isCancelled && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <div className="text-xs text-amber-800 leading-relaxed">
                            <span className="font-semibold">Auto-pay cancelled:</span> Access continues until{" "}
                            <span className="font-semibold">{formatDate(subscription.subscription_ends_at)}</span>.
                        </div>
                    </div>
                )}

                {/* Grace Period Notice */}
                {isGrace && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <div className="text-xs text-amber-800 leading-relaxed">
                            <span className="font-semibold">Grace period active:</span> Please check your payment method to ensure uninterrupted service.
                        </div>
                    </div>
                )}

                {/* Plan summary row */}
                <div className="bg-[#F9F8F6] border border-[#E8E5DF] rounded-xl p-3.5 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[11px] text-[#737373]">Current Plan</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-base font-bold text-[#0F0F0F]">
                                {subscription.plan === "PLUS" ? "HireSort Plus" : "HireSort Pro"}
                            </span>
                            <span className="text-xs font-medium text-[#737373] capitalize">
                                • {subscription.billing_interval} billing
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#E8E5DF] text-xs font-medium text-[#0F0F0F] shrink-0">
                        <span
                            className={`w-2 h-2 rounded-full ${isActive && !isCancelled
                                    ? "bg-emerald-500"
                                    : isCancelled
                                        ? "bg-amber-500"
                                        : "bg-gray-400"
                                }`}
                        />
                        {isCancelled ? "Expires at period end" : subscription.status || "Active"}
                    </div>
                </div>

                {/* Details Grid (2x2) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl border border-[#E8E5DF] bg-white">
                        <div className="flex items-center gap-2 text-xs text-[#737373] mb-1">
                            <Clock className="w-3.5 h-3.5 text-[#A0A0A0]" />
                            <span>Billing Interval</span>
                        </div>
                        <p className="text-sm font-semibold text-[#0F0F0F] capitalize">
                            {subscription.billing_interval}
                        </p>
                    </div>

                    <div className="p-3 rounded-xl border border-[#E8E5DF] bg-white">
                        <div className="flex items-center gap-2 text-xs text-[#737373] mb-1">
                            <Calendar className="w-3.5 h-3.5 text-[#A0A0A0]" />
                            <span>{isCancelled ? "Access Ends" : "Next Renewal"}</span>
                        </div>
                        <p className="text-sm font-semibold text-[#0F0F0F]">
                            {formatDate(subscription.subscription_ends_at)}
                        </p>
                    </div>

                    <div className="p-3 rounded-xl border border-[#E8E5DF] bg-white">
                        <div className="flex items-center gap-2 text-xs text-[#737373] mb-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#A0A0A0]" />
                            <span>Subscribed Since</span>
                        </div>
                        <p className="text-sm font-semibold text-[#0F0F0F]">
                            {formatDate(subscription.subscribed_from)}
                        </p>
                    </div>

                    <div className="p-3 rounded-xl border border-[#E8E5DF] bg-white">
                        <div className="flex items-center gap-2 text-xs text-[#737373] mb-1">
                            <CreditCard className="w-3.5 h-3.5 text-[#A0A0A0]" />
                            <span>Credit Balance</span>
                        </div>
                        <p className="text-sm font-semibold text-[#0F0F0F]">
                            {currencySymbol}
                            {Number(subscription.credit_balance ?? 0).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}{" "}
                            <span className="text-xs font-normal text-[#737373]">{currencyCode}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Subscription ID Footer */}
            <div className="mt-4 pt-3 border-t border-[#F0EEE9] flex items-center justify-between text-xs text-[#737373]">
                <div className="flex items-center gap-1.5 min-w-0">
                    <Zap className="w-3.5 h-3.5 text-[#A0A0A0] shrink-0" />
                    <span className="font-mono text-[11px] truncate">
                        ID: {subscription.sub_id}
                    </span>
                </div>
                <span className="text-[11px] text-[#A0A0A0] shrink-0">Secure Billing</span>
            </div>
        </div>
    );
};

export default Subscription;
