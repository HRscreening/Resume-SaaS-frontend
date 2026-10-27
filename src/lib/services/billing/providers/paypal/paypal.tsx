import IBillingProvider from "../IBillingProvider";
import { useEffect, useRef, useState } from "react";
import {
    checkoutSubscription,
    verifyPayment,
} from "@/modules/billing/billing_apis";
import type { User } from "@supabase/supabase-js";
import {
    CheckoutSubscription,
    CheckoutSubscriptionResponse,
    VerifyPayment,
    VerifyPaymentResponse,
    Plan,
    OrderType,
    PaymentProvider,
    PaymentStatus,
    SubscriptionAction
} from "@/types/subscription.type";

import type { Callbacks, RenderOptions } from "@/lib/services/billing/types";
import type { Profile } from "@/types";
import type { ComponentType } from "react";
import { PayPalCheckoutSubscriptionButton, PayPalCheckoutOrderButton } from "@/lib/services/billing/providers/paypal/PaypalComponent";




import {
    PayPalProvider as PayPalSDKProvider, PayPalSubscriptionButton,
} from "@paypal/react-paypal-js/sdk-v6";

// ─── PayPal v6 SDK Type Definitions ────────────────────────────────────────



// ─── PayPal Provider ────────────────────────────────────────────────────────

export default class PayPalBillingProvider implements IBillingProvider {
    /** Cache SDK instances keyed by sorted component list */

    private readonly environment: "sandbox" | "production" = import.meta.env.VITE_ENVIROMENT === "Production" || import.meta.env.PROD ? "production" : "sandbox";
    constructor(private readonly clientId: string) { }

    /** Pick sandbox or production SDK endpoint based on environment */
    private getSdkUrl(): string {
        const isProd = import.meta.env.VITE_ENVIROMENT === "Production" || import.meta.env.PROD;
        return isProd ? "https://www.paypal.com/web-sdk/v6/core" : "https://www.sandbox.paypal.com/web-sdk/v6/core";
    }

    // ─── IBillingProvider — programmatic checkout ────────────────────────────

    async subscriptionCheckout(data: CheckoutSubscription, user: User, callbacks?: Callbacks): Promise<void> {
        callbacks?.OnProcessing?.(true);
        try {
            const checkout = await checkoutSubscription(data);

            const components = checkout.type === OrderType.SUBSCRIPTION
                ? ["paypal-subscriptions"]
                : ["paypal-payments"];

        } catch (err) {
            callbacks?.OnError(err instanceof Error ? err.message : "Failed to complete PayPal checkout");
        } finally {
            callbacks?.OnProcessing?.(false);
        }
    }

    // ─── IBillingProvider — render UI component ─────────────────────────────

    subscriptionRenderUI(
        data: CheckoutSubscription,
        user?: User,
        options?: RenderOptions,
        callbacks?: Callbacks
    ): ComponentType {
        const provider = this;

        return function PayPalCheckoutUI() {

            const isSubscription = data.action === SubscriptionAction.UPGRADE || data.action === SubscriptionAction.DOWNGRADE;
            
            return (
                <PayPalSDKProvider
                    clientId={provider.clientId}
                    environment={provider.environment}
                    components={[isSubscription ? "paypal-subscriptions" : "paypal-payments"]}
                    pageType="checkout"
                >
                    {isSubscription ? (
                        <PayPalCheckoutSubscriptionButton
                            data={data}
                            callbacks={callbacks}
                            checkout={checkoutSubscription}
                            verifyPayment={verifyPayment}
                        />
                    ) : (
                        <PayPalCheckoutOrderButton
                            data={data}
                            callbacks={callbacks}
                            checkout={checkoutSubscription}
                            verifyPayment={verifyPayment}
                        />
                    )

                    }

                </PayPalSDKProvider>
            );
        };
    }
}
