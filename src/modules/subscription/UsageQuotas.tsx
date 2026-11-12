import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useUserUsageQuotas, useUserSubscription } from "@/modules/subscription/useSubscription";
import { CreditLogsDialog } from "@/modules/subscription/CreditLogsDialog";
import {
    Briefcase,
    FileSearch,
    Award,
    PhoneCall,
    Video,
    Users,
    Calendar,
    AlertTriangle,
    AlertCircle,
    CreditCard,
    ArrowUpRight,
    Plus,
    History,
} from "lucide-react";

interface UsageCardConfig {
    key: string;
    title: string;
    description: string;
    icon: React.ElementType;
    used: number;
}

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

function toCredit(value: number | string | null | undefined): number {
    const n = typeof value === "number" ? value : Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
}

function formatCredit(value: number): string {
    return value.toLocaleString(undefined, {
        minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
        maximumFractionDigits: 2,
    });
}

function creditShare(used: number, allocated: number): number {
    if (allocated <= 0) return used > 0 ? 100 : 0;
    return Math.min(Math.round((used / allocated) * 100), 100);
}

export const UsageQuotas = () => {
    const { data: subscriptionData } = useUserSubscription();
    const { data: usageData, isLoading, isError } = useUserUsageQuotas();
    const [historyOpen, setHistoryOpen] = useState(false);

    const isFreeQuota = !subscriptionData;
    const currencyCode = (subscriptionData?.credit_unit || "").toUpperCase();

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6 sm:p-7 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-[#E8E5DF] animate-pulse">
                    <div>
                        <div className="h-5 bg-[#E8E5DF] rounded-md w-44 mb-2" />
                        <div className="h-3.5 bg-[#F5F3EE] rounded-md w-72" />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 animate-pulse">
                    <div className="h-16 bg-[#F9F8F6] rounded-xl border border-[#E8E5DF]" />
                    <div className="h-16 bg-[#F9F8F6] rounded-xl border border-[#E8E5DF]" />
                    <div className="h-16 bg-[#F9F8F6] rounded-xl border border-[#E8E5DF]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 animate-pulse">
                    <div className="h-28 bg-[#F9F8F6] rounded-2xl border border-[#E8E5DF]" />
                    <div className="h-28 bg-[#F9F8F6] rounded-2xl border border-[#E8E5DF]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="p-5 rounded-2xl border border-[#E8E5DF] bg-[#FDFCFB] animate-pulse space-y-3"
                        >
                            <div className="h-4 bg-[#E8E5DF] rounded w-1/2" />
                            <div className="h-7 bg-[#E8E5DF] rounded w-2/3" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    if (isError || !usageData) {
        const message = isError
            ? "Unable to load usage data. Please try again."
            : "No usage data available.";

        return (
            <div className="flex min-h-75 items-center justify-center">
                <p className="text-sm text-gray-500">{message}</p>
            </div>
        );
    }
    const { usage, start, end } = usageData;
    const isExpired = Boolean(usageData.is_expired);
    const isGracePeriod = Boolean(usageData.is_grace_period);

    const planAllocated = toCredit(usageData.credit_allocated);
    const planUsed = toCredit(usageData.credit_used);
    const additionalAllocated = toCredit(usageData.additional_allocated);
    const additionalUsed = toCredit(usageData.additional_used);

    const planRemaining = Math.max(planAllocated - planUsed, 0);
    const additionalRemaining = Math.max(additionalAllocated - additionalUsed, 0);
    const totalAllocated = planAllocated + additionalAllocated;
    const totalUsed = planUsed + additionalUsed;
    const totalRemaining = planRemaining + additionalRemaining;
    const totalShare = creditShare(totalUsed, totalAllocated);

    const formatAmount = (value: number) =>
        `${formatCredit(value)}`;

    const cards: UsageCardConfig[] = [
        {
            key: "jobs_created",
            title: "Jobs Created",
            description: "Job postings created in this cycle",
            icon: Briefcase,
            used: usage?.jobs_created ?? 0,
        },
        {
            key: "sourced_candidates",
            title: "Candidates Sourced",
            description: "Candidates sourced across postings",
            icon: Users,
            used: usage?.sourced_candidates ?? 0,
        },
        {
            key: "resume_parsing",
            title: "Resume Parsing",
            description: "Resumes parsed into candidate profiles",
            icon: FileSearch,
            used: usage?.resume_parsing ?? 0,
        },
        {
            key: "resume_scoring",
            title: "Resume Scoring",
            description: "AI match scores run this cycle",
            icon: Award,
            used: usage?.resume_scoring ?? 0,
        },
        {
            key: "voice_screen",
            title: "Voice Screens",
            description: "Automated voice screening calls",
            icon: PhoneCall,
            used: usage?.voice_screen ?? 0,
        },
        {
            key: "interview",
            title: "Interviews",
            description: "AI interview rounds conducted",
            icon: Video,
            used: usage?.interview ?? 0,
        },
    ];

    const cycleLabel = isGracePeriod ? "Grace period" : isExpired ? "Expired" : "Active";
    const cycleDot = isGracePeriod
        ? "bg-amber-500"
        : isExpired
            ? "bg-red-500"
            : "bg-emerald-500";

    return (
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-[#E8E5DF]">
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-base font-semibold text-[#0F0F0F]">Usage & Credits</h2>

                        {isFreeQuota ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F5F3EE] text-[#525252] border border-[#E8E5DF]">
                                Free Plan
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F5F3EE] text-[#525252] border border-[#E8E5DF]">
                                Monthly Billing Cycle
                            </span>
                        )}

                        {isGracePeriod && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                <AlertCircle className="w-3 h-3" />
                                Grace Period
                            </span>
                        )}

                        {isExpired && !isGracePeriod && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                <AlertCircle className="w-3 h-3" />
                                Cycle Expired
                            </span>
                        )}

                        {!isExpired && !isGracePeriod && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Active Cycle
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-[#737373] mt-1">
                        Credits are the limit for this cycle. Feature counts show how much you have used.
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <button
                        type="button"
                        onClick={() => setHistoryOpen(true)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-xl text-[#525252] hover:text-[#0F0F0F] hover:bg-[#F5F3EE] transition-colors"
                    >
                        <History className="w-3.5 h-3.5" />
                        Credit history
                    </button>
                    <Link
                        to="/upgrade"
                        className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-xl border border-[#D4D4D4] text-[#0F0F0F] hover:bg-[#F5F3EE] transition-colors"
                    >
                        {isFreeQuota ? "Upgrade Plan" : "Change Plan"}
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#737373]" />
                    </Link>
                </div>
            </div>

            {isExpired && !isGracePeriod && (
                <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="text-xs font-semibold text-red-900">Billing cycle expired</h4>
                            <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                                This usage cycle has ended and credits are no longer available. Renew your subscription to restore credit allocations.
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/upgrade"
                        className="inline-flex items-center gap-1.5 self-start sm:self-auto h-8 px-3.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shrink-0 shadow-xs"
                    >
                        Renew Subscription
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            )}

            {isGracePeriod && (
                <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="text-xs font-semibold text-amber-900">Grace period</h4>
                        <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                            This billing cycle has ended, and remaining credits are still available during the grace period.
                        </p>
                    </div>
                </div>
            )}

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-[#E8E5DF] bg-[#F9F8F6]">
                    <div className="flex items-center gap-2 text-xs text-[#737373] mb-1">
                        <Calendar className="w-3.5 h-3.5 text-[#A0A0A0]" />
                        <span>Billing Period</span>
                    </div>
                    <p className="text-sm font-semibold text-[#0F0F0F]">
                        {formatDate(start)} – {formatDate(end)}
                    </p>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E8E5DF] bg-[#F9F8F6]">
                    <div className="flex items-center gap-2 text-xs text-[#737373] mb-1">
                        <AlertCircle className="w-3.5 h-3.5 text-[#A0A0A0]" />
                        <span>Cycle Status</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${cycleDot}`} />
                        <p className="text-sm font-semibold text-[#0F0F0F]">{cycleLabel}</p>
                    </div>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E8E5DF] bg-[#F9F8F6]">
                    <div className="flex items-center gap-2 text-xs text-[#737373] mb-1">
                        <CreditCard className="w-3.5 h-3.5 text-[#A0A0A0]" />
                        <span>Credits Remaining</span>
                    </div>
                    <p className="text-sm font-semibold text-[#0F0F0F]">
                        {formatAmount(totalRemaining)}
                        <span className="text-xs font-normal text-[#737373]">
                            {" "}
                            / {formatAmount(totalAllocated)}
                            {currencyCode ? ` ${currencyCode}` : ""}
                        </span>
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <CreditPoolCard
                    title="Plan credits"
                    description="Included with your current plan for this cycle"
                    icon={CreditCard}
                    used={planUsed}
                    allocated={planAllocated}
                    remaining={planRemaining}
                    formatAmount={formatAmount}
                />
                <CreditPoolCard
                    title="Additional credits"
                    description="Extra credits added on top of the plan allocation"
                    icon={Plus}
                    used={additionalUsed}
                    allocated={additionalAllocated}
                    remaining={additionalRemaining}
                    formatAmount={formatAmount}
                />
            </div>

            <div className="mt-4 p-3.5 rounded-xl border border-[#E8E5DF] bg-white">
                <div className="flex items-baseline justify-between gap-3 mb-2">
                    <p className="text-xs font-medium text-[#525252]">Total credits used</p>
                    <p className="text-xs text-[#737373]">
                        <span className="font-semibold text-[#0F0F0F]">{formatAmount(totalUsed)}</span>
                        {" "}of {formatAmount(totalAllocated)} · {totalShare}%
                    </p>
                </div>
                <div className="w-full h-1.5 bg-[#E8E5DF] rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${totalShare >= 100 ? "bg-red-500" : totalShare >= 80 ? "bg-amber-500" : "bg-[#0F0F0F]"
                            }`}
                        style={{ width: `${totalShare}%` }}
                    />
                </div>
            </div>

            <div className="mt-6 mb-3">
                <h3 className="text-sm font-semibold text-[#0F0F0F]">Feature usage</h3>
                <p className="text-xs text-[#737373] mt-0.5">
                    How many times each feature was used in this cycle. These counts do not have a separate limit.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cards.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={item.key}
                            className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-[#E8E5DF] bg-[#FDFCFB] hover:bg-white hover:border-[#D4D4D4] hover:shadow-xs transition-all"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-9 h-9 rounded-xl bg-[#F5F3EE] border border-[#E8E5DF] flex items-center justify-center text-[#0F0F0F] group-hover:bg-[#0F0F0F] group-hover:text-white transition-colors">
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-[11px] font-medium text-[#737373] bg-[#F5F3EE] border border-[#E8E5DF] px-2 py-0.5 rounded-full">
                                        This cycle
                                    </span>
                                </div>

                                <h3 className="text-sm font-semibold text-[#0F0F0F] leading-tight">
                                    {item.title}
                                </h3>
                                <p className="text-[11px] text-[#737373] mt-0.5 leading-snug line-clamp-2">
                                    {item.description}
                                </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-[#F0EEE9]">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-lg font-bold text-[#0F0F0F]">
                                        {item.used.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-[#737373] font-medium">used</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <CreditLogsDialog
                open={historyOpen}
                onOpenChange={setHistoryOpen}
                quotaPeriodId={usageData.id}
            />
        </div>
    );
};

function CreditPoolCard({
    title,
    description,
    icon: Icon,
    used,
    allocated,
    remaining,
    formatAmount,
}: {
    title: string;
    description: string;
    icon: React.ElementType;
    used: number;
    allocated: number;
    remaining: number;
    formatAmount: (value: number) => string;
}) {
    const share = creditShare(used, allocated);
    const isExhausted = allocated > 0 && used >= allocated;
    const isNearLimit = !isExhausted && share >= 80;

    return (
        <div className="p-4 sm:p-5 rounded-2xl border border-[#E8E5DF] bg-[#FDFCFB]">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F5F3EE] border border-[#E8E5DF] flex items-center justify-center text-[#0F0F0F] shrink-0">
                        <Icon className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-[#0F0F0F]">{title}</h3>
                        <p className="text-[11px] text-[#737373] mt-0.5 leading-snug">{description}</p>
                    </div>
                </div>
                <span
                    className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border ${isExhausted
                            ? "text-red-700 bg-red-50 border-red-200"
                            : isNearLimit
                                ? "text-amber-700 bg-amber-50 border-amber-200"
                                : "text-[#737373] bg-[#F5F3EE] border-[#E8E5DF]"
                        }`}
                >
                    {isExhausted ? "Used up" : `${share}% used`}
                </span>
            </div>

            <div className="mt-4 pt-3 border-t border-[#F0EEE9]">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-lg font-bold text-[#0F0F0F]">{formatAmount(used)}</span>
                    <span className="text-xs text-[#737373] font-medium">
                        / {formatAmount(allocated)} allocated
                    </span>
                </div>
                <div className="w-full h-1.5 bg-[#E8E5DF] rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${isExhausted ? "bg-red-500" : isNearLimit ? "bg-amber-500" : "bg-[#0F0F0F]"
                            }`}
                        style={{ width: `${share}%` }}
                    />
                </div>
                <p className="text-[11px] text-[#737373] mt-2">
                    {formatAmount(remaining)} remaining
                </p>
            </div>
        </div>
    );
}

export default UsageQuotas;
