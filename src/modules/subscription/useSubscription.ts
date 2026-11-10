import type { UserSubscription, UserMonthlyUsage } from "@/types/subscription.type"
import { getUserSubscription, getUserUsageQuotas, cancelSubscription, cancelScheduledDowngrade } from "@/modules/subscription/subscription_apis"
import { userSubscriptionQueryKey, UserUsageQuotasQueryKey } from "@/modules/shared/queryKeys/subscriptionQueryKeys"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"



export function useUserSubscription(enabled = true) {

    return useQuery({
        queryKey: [userSubscriptionQueryKey],
        queryFn: getUserSubscription,
        enabled: enabled,
        staleTime: 60 * 60 * 1000 // 1 hour as subscription data doesn't change frequently we can manually invalidate the query when user updates subscription
    })
}

export function useCancelAutoPayMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: cancelSubscription,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: [userSubscriptionQueryKey] });
            await queryClient.invalidateQueries({ queryKey: ["profile"] });
        },
    });
}

export function useCancelScheduledDowngradeMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: cancelScheduledDowngrade,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: [userSubscriptionQueryKey] });
            await queryClient.invalidateQueries({ queryKey: ["profile"] });
        },
    });
}


export function useUserUsageQuotas(enabled = true) {
    return useQuery({
        queryKey: [UserUsageQuotasQueryKey],
        queryFn: getUserUsageQuotas,
        enabled: enabled,
        staleTime: 60 * 1000 // 1 minute
    })
}