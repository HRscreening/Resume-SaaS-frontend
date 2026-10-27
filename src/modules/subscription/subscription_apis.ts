import { request } from "@/lib/api";
import type { UserSubscription,UserMonthlyUsage } from "@/types/subscription.type"


export async function getUserSubscription(): Promise<UserSubscription | null> {
    return request(`/api/v1/subscription`, {
        method: "GET",
    });
}


export async function getUserUsageQuotas(): Promise<UserMonthlyUsage> {
    return request(`/api/v1/subscription/quota`, {
        method: "GET",
    });
}





