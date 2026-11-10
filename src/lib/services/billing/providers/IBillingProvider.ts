import type { ComponentType } from "react";
import type { CheckoutSubscription,CheckoutSubscriptionResponse, VerifyPayment,VerifyPaymentResponse } from "@/types/subscription.type"
import { Profile } from "@/types";
import type { Callbacks,RenderOptions } from "@/lib/services/billing/types";
import type { User } from "@supabase/supabase-js";

/**
 * A common interface for billing providers to implement. This interface defines the methods that a billing provider must implement to handle subscription checkout and payment verification.
 * Each billing provider (e.g., Razorpay, PayPal) should implement this interface to provide a consistent API for subscription checkout and payment verification.
 * 
 * The subscriptionCheckout method is responsible for handling the entire checkout process including creating the checkout session, rendering the payment UI, handling payment success and failure, and verifying the payment.
 * The subscriptionRenderUI method is optional and can be used to provide a custom UI component for the checkout process. If not provided, a default UI will be used.
 * 
 * Always prefer the SubscriptionRenderUI method for subscription payment flow if it is available for the provider, as it provides a more integrated and user-friendly experience. The subscriptionCheckout method can be used for programmatic checkout flows where a UI component Provider owned.
 */
export default interface IBillingProvider {

    /**
     * 
     * @param data : CheckoutSubscription : The subscription data to be checked out including plan, billing interval, provider and action.
     * @param user : Profile : The user profile data including email, full name and plan.
     * @param callbacks : Callbacks : The callbacks to be called on success, error and cancel events.
     * @returns Promise<void> : Resolves when the checkout is successful, rejects with an error message if the checkout fails or is cancelled.
     * 
     * This method is responsible for handling the entire checkout process including creating the checkout session, rendering the payment UI, handling payment success and failure, and verifying the payment.
     * It should be implemented by each billing provider to handle their specific checkout flow.
     * 
     * The callbacks parameter is optional and can be used to provide custom behavior on success, error and cancel events.
     * 
     * The renderUI method is optional and can be used to provide a custom UI component for the checkout process. If not provided, a default UI will be used.
     */
    subscriptionCheckout(data:CheckoutSubscription,user:User,callbacks?:Callbacks): Promise<void>; 

    subscriptionRenderUI?(data:CheckoutSubscription,user?:User,options?:RenderOptions,callbacks?:Callbacks):ComponentType; // Optional method for rendering UI components if needed
}