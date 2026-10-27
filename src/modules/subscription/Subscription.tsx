import React from "react";
import { Link } from "@tanstack/react-router";
import { useUserSubscription } from "@/modules/subscription/useSubscription";
import { type UserSubscription } from "@/types/subscription.type";
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

export const Subscription = () => {
    //   const { data: subscription, isLoading, isError } = useUserSubscription();

    //   if (isLoading) {
    //     return (
    //       <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6 sm:p-7 animate-pulse">
    //         <div className="h-6 bg-[#E8E5DF] rounded-md w-1/3 mb-2" />
    //         <div className="h-4 bg-[#F5F3EE] rounded-md w-1/2 mb-6" />
    //         <div className="h-20 bg-[#F9F8F6] rounded-xl border border-[#E8E5DF] mb-5" />
    //         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
    //           <div className="h-20 bg-[#F5F3EE] rounded-xl" />
    //           <div className="h-20 bg-[#F5F3EE] rounded-xl" />
    //           <div className="h-20 bg-[#F5F3EE] rounded-xl" />
    //         </div>
    //       </div>
    //     );
    //   }

    //   // If subscription details are null, do not show subscription UI
    //   if (!subscription || isError) {
    //     return null;
    //   }
    const subscription: UserSubscription = {
        sub_id: "sub_123456789",
        plan: "PLUS",
        billing_interval: "monthly",
        status: "Active",
        auto_pay_cancelled_at: null,
        credit_balance: 0,
        credit_currency: "USD",
        is_grace_period: false,
        subscribed_from: "2023-01-01T00:00:00Z",
        subscription_ends_at: "2023-12-31T23:59:59Z"
    }

    const isCancelled = Boolean(subscription.auto_pay_cancelled_at);
    const isGrace = subscription.is_grace_period;
    const isActive = subscription.status?.toLowerCase() === "active";
    const currencySymbol = subscription.credit_currency === "INR" ? "₹" : "$";

    return (
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6 sm:p-7 shadow-xs">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-[#E8E5DF]">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h2 className="text-base font-semibold text-[#0F0F0F]">Subscription Details</h2>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0F0F0F] text-white">
                            {subscription.plan}
                        </span>
                    </div>
                    <p className="text-xs text-[#737373] mt-1">
                        Current subscription plan, renewal date, and billing interval.
                    </p>
                </div>

                <Link
                    to="/upgrade"
                    className="inline-flex items-center gap-1.5 self-start sm:self-auto h-9 px-3.5 text-xs font-medium rounded-xl border border-[#D4D4D4] text-[#0F0F0F] hover:bg-[#F5F3EE] transition-colors"
                >
                    Change plan
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#737373]" />
                </Link>
            </div>

            {/* Auto-pay Cancelled Notice */}
            {isCancelled && (
                <div className="mt-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-800 leading-relaxed">
                        <span className="font-semibold">Auto-pay cancelled:</span> Your subscription will not renew automatically. You will continue to have access until{" "}
                        <span className="font-semibold">{formatDate(subscription.subscription_ends_at)}</span>.
                    </div>
                </div>
            )}

            {/* Grace Period Notice */}
            {isGrace && (
                <div className="mt-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-800 leading-relaxed">
                        <span className="font-semibold">Grace period active:</span> Please check your payment method to ensure continued uninterrupted service.
                    </div>
                </div>
            )}

            {/* Plan summary row */}
            <div className="mt-5 bg-[#F9F8F6] border border-[#E8E5DF] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <p className="text-xs text-[#737373]">Current Plan</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-lg font-bold text-[#0F0F0F]">
                            {subscription.plan === "PLUS" ? "HireSort Plus" : "HireSort Pro"}
                        </span>
                        <span className="text-xs font-medium text-[#737373] capitalize">
                            • {subscription.billing_interval} billing
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#E8E5DF] text-xs font-medium text-[#0F0F0F]">
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
            </div>

            {/* Details Grid */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-[#E8E5DF] bg-white">
                    <div className="flex items-center gap-2 text-xs text-[#737373] mb-1">
                        <Clock className="w-3.5 h-3.5 text-[#A0A0A0]" />
                        <span>Billing Interval</span>
                    </div>
                    <p className="text-sm font-semibold text-[#0F0F0F] capitalize">
                        {subscription.billing_interval}
                    </p>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E8E5DF] bg-white">
                    <div className="flex items-center gap-2 text-xs text-[#737373] mb-1">
                        <Calendar className="w-3.5 h-3.5 text-[#A0A0A0]" />
                        <span>{isCancelled ? "Access Ends" : "Next Renewal"}</span>
                    </div>
                    <p className="text-sm font-semibold text-[#0F0F0F]">
                        {formatDate(subscription.subscription_ends_at)}
                    </p>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E8E5DF] bg-white">
                    <div className="flex items-center gap-2 text-xs text-[#737373] mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#A0A0A0]" />
                        <span>Subscribed Since</span>
                    </div>
                    <p className="text-sm font-semibold text-[#0F0F0F]">
                        {formatDate(subscription.subscribed_from)}
                    </p>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E8E5DF] bg-white">
                    <div className="flex items-center gap-2 text-xs text-[#737373] mb-1">
                        <CreditCard className="w-3.5 h-3.5 text-[#A0A0A0]" />
                        <span>Credit Balance</span>
                    </div>
                    <p className="text-sm font-semibold text-[#0F0F0F]">
                        {currencySymbol}
                        {subscription.credit_balance.toLocaleString()} {subscription.credit_currency}
                    </p>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E8E5DF] bg-white sm:col-span-2">
                    <div className="flex items-center gap-2 text-xs text-[#737373] mb-1">
                        <Zap className="w-3.5 h-3.5 text-[#A0A0A0]" />
                        <span>Subscription ID</span>
                    </div>
                    <p className="text-xs font-mono text-[#525252] truncate">
                        {subscription.sub_id}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Subscription;
