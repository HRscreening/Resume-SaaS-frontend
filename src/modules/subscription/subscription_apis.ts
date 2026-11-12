import { request } from "@/lib/api";
import type { UserSubscription, UserMonthlyUsage, CreditLog } from "@/types/subscription.type"
import { detectBillingCurrency } from "../../lib/currency";

export async function getUserSubscription(): Promise<UserSubscription | null> {
    
    const currency = detectBillingCurrency()

    return request(`/api/v1/subscription?currency=${encodeURIComponent(currency)}`, {
        method: "GET",
    });
}


export async function getUserUsageQuotas(): Promise<UserMonthlyUsage> {
    return request(`/api/v1/quota/usage`, {
        method: "GET",
    });
}

export async function getCreditLogs(
    quotaPeriodId: string,
    page: number,
    limit: number,
): Promise<CreditLog[]> {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });
    return request(
        `/api/v1/quota/credit_logs/${encodeURIComponent(quotaPeriodId)}?${params.toString()}`,
        { method: "GET" },
    );
}

export async function cancelSubscription(): Promise<{
}> {
    return request("/api/v1/subscription/cancel", { method: "POST" });
}


export async function resumeSubscription(): Promise<{ success: boolean }> {
    return request("/api/v1/subscription/resume", {
        method: "POST",
    });
}


