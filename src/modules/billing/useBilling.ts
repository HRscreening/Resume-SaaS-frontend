// Handle Billing Checkout

import { useState, useRef, type ComponentType } from "react";
import { type IBillingProvider, getBillingProvider } from "@/lib/services/billing";
import { type Plan, SubscriptionActionType, PaymentProviderType, BillingIntervalType } from "@/types/subscription.type";
import type { CheckoutSubscription } from "@/types/subscription.type";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";



export interface UseBillingOptions {
    plan: Plan;
    action: SubscriptionActionType;
    billingInterval: BillingIntervalType;
    paymentGateway: PaymentProviderType;
    onSuccess?: () => void;
    onError?: (error?: string) => void;
    onCancel?: () => void;
    onProcessing?: (isProcessing: boolean) => void;
}

const useBilling = (options: UseBillingOptions) => {
    const [PaymentUI, setPaymentUI] = useState<ComponentType | null>(null);
    const { user } = useAuth();
    const isSubscribingRef = useRef(false);

    const subscribe = async () => {
        // Prevent double clicks or simultaneous calls
        if (isSubscribingRef.current) {
            return;
        }
        isSubscribingRef.current = true;

        const { action, paymentGateway, billingInterval, plan, ...fn } = options;

        if (!user) {
            isSubscribingRef.current = false;
            toast.error("You need to be logged in to subscribe");
            fn.onError?.("User not authenticated");
            return;
        }

        let provider: IBillingProvider;
        try {
            provider = getBillingProvider(paymentGateway);
        } catch (err) {
            isSubscribingRef.current = false;
            const msg = err instanceof Error ? err.message : "Payment provider unavailable";
            toast.error(msg);
            fn.onError?.(msg);
            return;
        }

        const data: CheckoutSubscription = {
            action,
            billing_interval: billingInterval,
            new_plan: plan,
            provider: paymentGateway,
        };

        // Signal processing start
        fn.onProcessing?.(true);

        const callbacks = {
            OnCancel: () => {
                isSubscribingRef.current = false;
                fn.onProcessing?.(false);
                toast.info("Payment cancelled");
                fn.onCancel?.();
            },
            OnError: (error?: string) => {
                isSubscribingRef.current = false;
                fn.onProcessing?.(false);
                const msg = error || "Payment failed. Please try again.";
                toast.error(msg);
                fn.onError?.(msg);
            },
            OnPending: (message?: string) => {
                isSubscribingRef.current = false;
                fn.onProcessing?.(false);
                toast.info(message || "Payment is being reviewed. Your plan will upgrade once it clears.");
            },
            OnSuccess: async () => {
                fn.onProcessing?.(false);
                setPaymentUI(null);
                toast.success("Payment successful! Upgrading your plan…");
                if (fn.onSuccess) {
                    try {
                        await fn.onSuccess();
                    } catch (err) {
                        console.error("onSuccess error:", err);
                        window.location.href = "/dashboard";
                    }
                } else {
                    window.location.href = "/dashboard";
                }
            },
            OnProcessing: (isProcessing: boolean) => {
                if (!isProcessing) {
                    isSubscribingRef.current = false;
                }
                fn.onProcessing?.(isProcessing);
            },
        };

        try {
            if (provider.subscriptionRenderUI) {
                const PaymentComponent = provider.subscriptionRenderUI(
                    data,
                    user,
                    undefined,
                    callbacks
                );
                setPaymentUI(() => PaymentComponent);
                isSubscribingRef.current = false;
                return;
            }

            await provider.subscriptionCheckout(data, user, callbacks);
        } catch (err) {
            isSubscribingRef.current = false;
            fn.onProcessing?.(false);
            const msg = err instanceof Error ? err.message : "Something went wrong with payment";
            // Don't toast "cancelled" — the OnCancel callback already handles that
            if (msg !== "cancelled") {
                toast.error(msg);
                fn.onError?.(msg);
            }
        }
    };

    return { subscribe, PaymentUI };
};

export { useBilling };