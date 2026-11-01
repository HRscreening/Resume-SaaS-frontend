import React from "react";
import { Link } from "@tanstack/react-router";
import { useUserUsageQuotas } from "@/modules/subscription/useSubscription";
import { type QuotaUsage } from "@/types/subscription.type";
import {
    Briefcase,
    FileText,
    Users,
    FileSearch,
    Award,
    PhoneCall,
    Video,
    Calendar,
    Infinity as InfinityIcon,
    AlertTriangle,
    AlertCircle,
    Clock,
    RefreshCw,
    CreditCard,
    ArrowUpRight,
} from "lucide-react";

interface QuotaCardConfig {
    key: string;
    title: string;
    description: string;
    icon: React.ElementType;
    quota: QuotaUsage | undefined;
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

export const UsageQuotas = () => {
    const { data: usageData, isLoading, isError } = useUserUsageQuotas();

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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div
                            key={i}
                            className="p-5 rounded-2xl border border-[#E8E5DF] bg-[#FDFCFB] animate-pulse space-y-3"
                        >
                            <div className="h-4 bg-[#E8E5DF] rounded w-1/2" />
                            <div className="h-7 bg-[#E8E5DF] rounded w-2/3" />
                            <div className="h-2 bg-[#E8E5DF] rounded-full w-full" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (isError || !usageData || !usageData.quotas) {
        return null;
    }

    const { quotas, start, end } = usageData;
    const isExpired = Boolean(usageData.is_expired);
    const isGracePeriod = Boolean(usageData.is_grace_period);

    const cards: QuotaCardConfig[] = [
        {
            key: "job_quota",
            title: "Active Jobs",
            description: "Number of active job postings allowed",
            icon: Briefcase,
            quota: quotas.job_quota,
        },
        {
            key: "jd_creation_quota",
            title: "JD Creations",
            description: "AI-assisted job description generations",
            icon: FileText,
            quota: quotas.jd_creation_quota,
        },
        {
            key: "application_sourced_quota",
            title: "Applications Sourced",
            description: "Candidates sourced across postings",
            icon: Users,
            quota: quotas.application_sourced_quota,
        },
        {
            key: "resume_parsing_quota",
            title: "Resume Parsing",
            description: "Resumes parsed and extracted into profiles",
            icon: FileSearch,
            quota: quotas.resume_parsing_quota,
        },
        {
            key: "resume_scoring_quota",
            title: "Resume Scoring",
            description: "AI match scoring and fit analysis",
            icon: Award,
            quota: quotas.resume_scoring_quota,
        },
        {
            key: "voice_call_quota",
            title: "Voice Calls",
            description: "Automated candidate voice screening calls",
            icon: PhoneCall,
            quota: quotas.voice_call_quota,
        },
        {
            key: "interview_quota",
            title: "Interviews",
            description: "AI structured interview rounds conducted",
            icon: Video,
            quota: quotas.interview_quota,
        },
    ];

    return (
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6 sm:p-7 shadow-xs">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-[#E8E5DF]">
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-base font-semibold text-[#0F0F0F]">Usage & Quotas</h2>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F5F3EE] text-[#525252] border border-[#E8E5DF]">
                            Monthly Billing Cycle
                        </span>
                        {isExpired && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                <AlertCircle className="w-3 h-3" />
                                Cycle Expired
                            </span>
                        )}
                        {isGracePeriod && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                Grace Period Active
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
                        Track your feature consumption and limits for the active billing cycle.
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <Link
                        to="/upgrade"
                        className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-xl border border-[#D4D4D4] text-[#0F0F0F] hover:bg-[#F5F3EE] transition-colors"
                    >
                        Change plan
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#737373]" />
                    </Link>
                </div>
            </div>

            {/* Status Notices for Expired and Grace Period */}
            {isExpired && (
                <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="text-xs font-semibold text-red-900">Billing cycle expired</h4>
                            <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                                Your monthly usage cycle has expired. Feature quotas and limits are no longer active. Upgrade or renew your subscription to restore quota allocations.
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
                <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="text-xs font-semibold text-amber-900">Grace period active</h4>
                            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                                Your subscription is currently in a grace period. Feature quotas remain temporarily accessible. Please verify your payment method to ensure uninterrupted service.
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/upgrade"
                        className="inline-flex items-center gap-1.5 self-start sm:self-auto h-8 px-3.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shrink-0 shadow-xs"
                    >
                        Manage Billing
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            )}

            {/* Cycle Overview Row */}
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
                        <Clock className="w-3.5 h-3.5 text-[#A0A0A0]" />
                        <span>Grace Period</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span
                            className={`w-2 h-2 rounded-full ${
                                isGracePeriod ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                            }`}
                        />
                        <p className="text-sm font-semibold text-[#0F0F0F]">
                            {isGracePeriod ? "Active" : "Inactive"}
                        </p>
                    </div>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E8E5DF] bg-[#F9F8F6]">
                    <div className="flex items-center gap-2 text-xs text-[#737373] mb-1">
                        <AlertCircle className="w-3.5 h-3.5 text-[#A0A0A0]" />
                        <span>Cycle Status</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span
                            className={`w-2 h-2 rounded-full ${
                                isExpired ? "bg-red-500" : "bg-emerald-500"
                            }`}
                        />
                        <p className="text-sm font-semibold text-[#0F0F0F]">
                            {isExpired ? "Expired" : "Active"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Quota Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
                {cards.map((item) => {
                    const Icon = item.icon;
                    const used = item.quota?.used ?? 0;
                    const limit = item.quota?.limit ?? 0;
                    const isUnlimited = limit === -1;
                    const percentage = isUnlimited
                        ? 0
                        : limit > 0
                        ? Math.min(Math.round((used / limit) * 100), 100)
                        : 100;
                    const isExhausted = !isUnlimited && used >= limit && limit > 0;
                    const isNearLimit = !isUnlimited && percentage >= 80 && !isExhausted;

                    return (
                        <div
                            key={item.key}
                            className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-[#E8E5DF] bg-[#FDFCFB] hover:bg-white hover:border-[#D4D4D4] hover:shadow-xs transition-all"
                        >
                            {/* Card Top: Icon & Status Badge */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-9 h-9 rounded-xl bg-[#F5F3EE] border border-[#E8E5DF] flex items-center justify-center text-[#0F0F0F] group-hover:bg-[#0F0F0F] group-hover:text-white transition-colors">
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    {isUnlimited ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                            <InfinityIcon className="w-3 h-3" />
                                            Unlimited
                                        </span>
                                    ) : isExhausted ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                            <AlertTriangle className="w-3 h-3" />
                                            Limit reached
                                        </span>
                                    ) : (
                                        <span
                                            className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                                                isNearLimit
                                                    ? "text-amber-700 bg-amber-50 border-amber-200"
                                                    : "text-[#737373] bg-[#F5F3EE] border-[#E8E5DF]"
                                            }`}
                                        >
                                            {percentage}% used
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-sm font-semibold text-[#0F0F0F] leading-tight">
                                    {item.title}
                                </h3>
                                <p className="text-[11px] text-[#737373] mt-0.5 leading-snug line-clamp-2">
                                    {item.description}
                                </p>
                            </div>

                            {/* Card Bottom: Numbers & Progress Bar */}
                            <div className="mt-4 pt-3 border-t border-[#F0EEE9]">
                                <div className="flex items-baseline justify-between mb-2">
                                    <span className="text-lg font-bold text-[#0F0F0F]">
                                        {used.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-[#737373] font-medium">
                                        {isUnlimited ? (
                                            <span className="inline-flex items-center gap-1">
                                                / <InfinityIcon className="w-3 h-3 inline" />
                                            </span>
                                        ) : (
                                            `/ ${limit.toLocaleString()}`
                                        )}
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full h-1.5 bg-[#E8E5DF] rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            isUnlimited
                                                ? "bg-emerald-500 w-full"
                                                : isExhausted
                                                ? "bg-red-500"
                                                : isNearLimit
                                                ? "bg-amber-500"
                                                : "bg-[#0F0F0F]"
                                        }`}
                                        style={{ width: isUnlimited ? "100%" : `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default UsageQuotas;
