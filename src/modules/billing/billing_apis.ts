import { request } from "@/lib/api";
import type { CheckoutSubscription, CheckoutSubscriptionResponse, VerifyPayment, VerifyPaymentResponse, BillingIntervalType, SubscriptionActionType, ChangePreview, ChangeSubscriptionRequest } from "@/types/subscription.type"
import type { SubscriptionPlan } from "@/types";
import type { CheckoutQuoteResponse } from "@/types/planCheckout.type"
import { detectBillingCurrency } from "../../lib/currency";
// ---------------------------------------- Billing APIs ---------------------------------------- //
export async function changeSubscription(data: ChangeSubscriptionRequest): Promise<CheckoutSubscriptionResponse> {
    return request(`/api/v1/subscription/change`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

// Providers call this with the checkout payload. Everything except a renewal is a plan change.
export async function checkoutSubscription(data: CheckoutSubscription): Promise<CheckoutSubscriptionResponse> {
    if (data.action !== "renewal") {
        return changeSubscription({
            plan: data.new_plan,
            interval: data.billing_interval,
            provider: data.provider,
        });
    }
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

export async function getCheckoutQuote(plan: SubscriptionPlan, billing_interval: BillingIntervalType): Promise<CheckoutQuoteResponse> {
    
    const currency = detectBillingCurrency()
    
    return request(`/api/v1/subscription/charge-quote?plan=${encodeURIComponent(plan)}&cycle=${encodeURIComponent(billing_interval)}&currency=${encodeURIComponent(currency)}`, {
        method: "GET",
    });
}

export async function getChangePreview(plan: SubscriptionPlan, interval: BillingIntervalType): Promise<ChangePreview> {
    const currency = detectBillingCurrency()

    return request(`/api/v1/subscription/change-preview?plan=${encodeURIComponent(plan)}&interval=${encodeURIComponent(interval)}&currency=${encodeURIComponent(currency)}`, {
        method: "GET",
    });
}

export async function downgrade(plan: SubscriptionPlan, billing_interval: BillingIntervalType) {
    
    return request(`/api/v1/subscription/downgrade-subscription?downgrade_plan=${encodeURIComponent(plan)}&billing_cycle=${encodeURIComponent(billing_interval)}`, {
        method: "POST",
    });
}
