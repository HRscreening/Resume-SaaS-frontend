import { request } from "@/lib/api";
import type { CheckoutSubscription, CheckoutSubscriptionResponse, VerifyPayment, VerifyPaymentResponse, BillingIntervalType, SubscriptionActionType} from "@/types/subscription.type"
import type { CheckoutQuoteResponse } from "@/types/planCheckout.type"
import { detectBillingCurrency } from "../../lib/currency";
// ---------------------------------------- Billing APIs ---------------------------------------- //
export async function checkoutSubscription(data: CheckoutSubscription): Promise<CheckoutSubscriptionResponse> {
    return request(`/api/v1/subscription/checkout-subscription`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function verifyPayment(data: VerifyPayment): Promise<VerifyPaymentResponse> {
    return request(`/api/v1/subscription/verify-checkout`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function getCheckoutQuote(plan: SubscriptionActionType, billing_interval: BillingIntervalType): Promise<CheckoutQuoteResponse> {
    
    const currency = detectBillingCurrency()
    
    return request(`/api/v1/subscription/charge-quote?plan=${encodeURIComponent(plan)}&cycle=${encodeURIComponent(billing_interval)}&currency=${"USD"}`, {
        method: "GET",
    });
}

