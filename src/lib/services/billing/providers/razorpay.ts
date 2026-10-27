import IBillingProvider from "./IBillingProvider";
import { checkoutSubscription, verifyPayment } from "@/modules/billing/billing_apis";
import { CheckoutSubscription, CheckoutSubscriptionResponse, VerifyPayment,VerifyPaymentResponse, Plan, OrderType, PaymentProvider } from "@/types/subscription.type"
import type { Callbacks } from "@/lib/services/billing/types";
import type { Profile } from "@/types";
import type { User } from "@supabase/supabase-js";

interface GenerateOptionParams {
    plan: Plan;
    orderDetails: CheckoutSubscriptionResponse;
    profile: User;
    onSuccess: (
        paymentId: string,
        signature: string
    ) => Promise<void>;
    onCancel: () => void;
};


export default class RazorpayProvider implements IBillingProvider {

    private scriptLoadPromise: Promise<void> | null = null;
    private readonly scriptUrl: string = "https://checkout.razorpay.com/v1/checkout.js";


    // ------------------- Private Methods -------------------
    private loadRazorpayScript(): Promise<void> {
        if (typeof window === "undefined") return Promise.reject(new Error("Razorpay requires browser"));
        if ((window as any).Razorpay) return Promise.resolve();
        if (this.scriptLoadPromise) return this.scriptLoadPromise;
        this.scriptLoadPromise = new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = this.scriptUrl;
            script.onload = () => resolve();
            script.onerror = () => {
                this.scriptLoadPromise = null;
                reject(new Error("Failed to load Razorpay"));
            };
            document.body.appendChild(script);
        });
        return this.scriptLoadPromise;
    }

    private generateOption(input: GenerateOptionParams): any {

        const { plan, orderDetails, profile, onSuccess, onCancel, } = input;

        const full_name = input.profile.user_metadata?.full_name ?? "User";

        const options: any = {
            key: orderDetails.key,
            name: "HireSort",
            description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
            prefill: {
                email: profile.email ?? "",
                name: full_name,
            },
            theme: { color: "#0F0F0F" },
            handler: (response: {
                razorpay_payment_id: string;
                razorpay_order_id: string;
                razorpay_signature: string;
            }) => {
                onSuccess(response.razorpay_payment_id, response.razorpay_signature);
            },
            // Dismissing the modal is a user cancellation. Do not poll here: that
            // leaves the checkout button in "Processing…" for up to 20 seconds
            // (or indefinitely if a profile request hangs).
            modal: { ondismiss: () => { onCancel(); } },
        };

        if (orderDetails.type === OrderType.ORDER) {
            options.amount = orderDetails.amount;
            options.currency = orderDetails.currency;
            options.order_id = orderDetails.provider_id;
        }
        else if (orderDetails.type === OrderType.SUBSCRIPTION) {
            options.subscription_id = orderDetails.provider_id;
            options.plan_id = orderDetails.provider_plan_id;
        }
        else throw new Error("Invalid order type");

        return options;

    }

    // ------------------- Public Methods -------------------

    async subscriptionCheckout(data: CheckoutSubscription, user: User, callbacks?: Callbacks): Promise<void> {

        callbacks?.OnProcessing?.(true);

        await this.loadRazorpayScript();
        data.provider = PaymentProvider.RAZORPAY; // Ensure the provider is set to Razorpay

        let order: CheckoutSubscriptionResponse;
        try {
            order = await checkoutSubscription(data);
        } catch (err) {
            callbacks?.OnProcessing?.(false);
            const msg = err instanceof Error ? err.message : "Failed to create checkout session";
            callbacks?.OnError(msg);
            throw err;
        }

        await new Promise<void>((resolve, reject) => {
            let settled = false;
            let handlerFired = false;

            function onCancel() {
                if (handlerFired || settled) return;
                settled = true;
                callbacks?.OnProcessing?.(false);
                callbacks?.OnCancel();
                reject(new Error("cancelled"));
            }

            const onSuccess = async (paymentId: string, signature: string) => {
                if (settled) return;
                handlerFired = true;
                callbacks?.OnProcessing?.(true);
                try {
                    const result = await verifyPayment({
                        payment_id: paymentId,
                        signature: signature,
                        provider: PaymentProvider.RAZORPAY,
                        subscription_id: order.subscription_id,
                    });

                    const status = result?.status?.toLowerCase();
                    if (status === "failed") {
                        throw new Error(result.message ?? "Payment verification failed. Contact support.");
                    } else if (status === "pending") {
                        settled = true;
                        callbacks?.OnProcessing?.(false);
                        callbacks?.OnPending?.(result.message ?? "Payment is pending. Please check your email for confirmation.");
                        resolve();
                    } else {
                        settled = true;
                        callbacks?.OnProcessing?.(false);
                        callbacks?.OnSuccess();
                        resolve();
                    }
                } catch (error) {
                    settled = true;
                    callbacks?.OnProcessing?.(false);
                    const msg = error instanceof Error ? error.message : "Payment verification failed";
                    callbacks?.OnError(msg);
                    reject(error);
                }
            };

            const options = this.generateOption({ plan: data.new_plan, orderDetails: order, profile: user, onCancel, onSuccess: onSuccess, });

            // @ts-expect-error — Razorpay loaded via script tag
            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", (response: any) => {
                if (settled) return;
                settled = true;
                callbacks?.OnProcessing?.(false);
                const msg = response?.error?.description || "Payment failed";
                callbacks?.OnError(msg);
                reject(new Error(msg));
            });

            rzp.open();
        });

    }

}