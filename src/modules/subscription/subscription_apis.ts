import { request } from "@/lib/api";
import type { UserSubscription,UserMonthlyUsage } from "@/types/subscription.type"
import { detectBillingCurrency } from "../../lib/currency";

export async function getUserSubscription(): Promise<UserSubscription | null> {
    
    const currency = detectBillingCurrency()

    return request(`/api/v1/subscription?currency=${encodeURIComponent(currency)}`, {
        method: "GET",
    });
}


export async function getUserUsageQuotas(): Promise<UserMonthlyUsage> {
    return request(`/api/v1/subscription/quota`, {
        method: "GET",
    });
}





