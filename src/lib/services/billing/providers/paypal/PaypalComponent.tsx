
import { PayPalProvider, PayPalSubscriptionButton, PayPalOneTimePaymentButton, } from "@paypal/react-paypal-js/sdk-v6";
import type { Callbacks } from "@/lib/services/billing/types";
import type { CheckoutSubscription, CheckoutSubscriptionResponse, VerifyPayment, VerifyPaymentResponse } from "@/types/subscription.type"
import { useEffect,useState } from "react";



interface PayPalCheckoutButtonProps {
    data: CheckoutSubscription
    callbacks?: Callbacks;
    checkout: (data: CheckoutSubscription) => Promise<CheckoutSubscriptionResponse>;
    verifyPayment: (data: VerifyPayment) => Promise<VerifyPaymentResponse>;
}


export function PayPalCheckoutSubscriptionButton({ data, callbacks, checkout,verifyPayment }: PayPalCheckoutButtonProps) {

    const [appSubscriptionId, setAppSubscriptionId] = useState<string | null>(null);

    return (
        <PayPalSubscriptionButton
            presentationMode="auto"
            createSubscription=
            {async () => {
                const sub = await checkout(data);
                setAppSubscriptionId(sub.subscription_id);
                return { subscriptionId: sub.provider_id };
            }}
            onApprove={async ({subscriptionId}) => {
                if (!appSubscriptionId) {
                    callbacks?.OnError("Subscription ID is missing. Cannot verify payment.");
                    return;
                }
                callbacks?.OnProcessing?.(true);
                try {
                    const result = await verifyPayment({
                        provider: "paypal",
                        payment_id: subscriptionId,
                        subscription_id: appSubscriptionId,
                    });
                    const status = result?.status?.toLowerCase();
                    if (status === "failed") {
                        throw new Error(result.message ?? "Payment verification failed");
                    } else if (status === "pending") {
                        callbacks?.OnProcessing?.(false);
                        callbacks?.OnPending?.(result.message);
                    } else {
                        callbacks?.OnProcessing?.(false);
                        callbacks?.OnSuccess();
                    }
                } catch (err) {
                    callbacks?.OnProcessing?.(false);
                    callbacks?.OnError(err instanceof Error ? err.message : "Payment verification failed");
                }
            }}
            onCancel={() => {
                callbacks?.OnCancel();
            }}
            onError={(error) => {
                callbacks?.OnError(
                    error instanceof Error
                        ? error.message
                        : "PayPal payment failed"
                );
            }}
        />
    );
}




export function PayPalCheckoutOrderButton({
    data,
    callbacks,
    checkout,
    verifyPayment
}: PayPalCheckoutButtonProps) {

    const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

    return (
        <PayPalOneTimePaymentButton
            presentationMode="auto"
            createOrder={async () => {

                const order = await checkout(data);
                setSubscriptionId(order.subscription_id);

                return {
                    orderId: order.provider_id,
                };
            }}
            onApprove={async ({orderId}) => {
                if (!subscriptionId) {
                    callbacks?.OnError("Subscription ID is missing. Cannot verify payment.");
                    return;
                }
                callbacks?.OnProcessing?.(true);
                try {
                    const result = await verifyPayment({
                        provider: "paypal",
                        payment_id: orderId,
                        subscription_id: subscriptionId,
                    });
                    const status = result?.status?.toLowerCase();
                    if (status === "failed") {
                        throw new Error(result.message ?? "Payment verification failed");
                    } else if (status === "pending") {
                        callbacks?.OnProcessing?.(false);
                        callbacks?.OnPending?.(result.message);
                    } else {
                        callbacks?.OnProcessing?.(false);
                        callbacks?.OnSuccess();
                    }
                } catch (err) {
                    callbacks?.OnProcessing?.(false);
                    callbacks?.OnError(err instanceof Error ? err.message : "Payment verification failed");
                }
            }}
            onCancel={() => {
                callbacks?.OnCancel();
            }}
            onError={(error) => {
                callbacks?.OnError(
                    error instanceof Error
                        ? error.message
                        : "PayPal payment failed"
                );
            }}
        />
    );
}