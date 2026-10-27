// Contains Both Billing and Subscription related types and constants. 

import { z } from "zod";


export type Plan = "PRO" | "PLUS" // only these two plans are available for subscription
type PaymentProvider = "razorpay" | "paypal" // only these two providers are available for subscription



export const PaymentProvider = {
  RAZORPAY: "razorpay",
  PAYPAL: "paypal",
} as const;

export type PaymentProviderType = typeof PaymentProvider[keyof typeof PaymentProvider];

export const SubscriptionAction = {
  UPGRADE: "upgrade",
  DOWNGRADE: "downgrade",
  RENEWAL: "renewal",
} as const;

export type SubscriptionActionType = typeof SubscriptionAction[keyof typeof SubscriptionAction];

export const BillingInterval = {
  MONTHLY: "monthly",
  YEARLY: "yearly",
} as const;

export type BillingIntervalType = typeof BillingInterval[keyof typeof BillingInterval];

export type CheckoutSubscription = {
  new_plan: Plan;
  billing_interval: BillingIntervalType;
  provider: PaymentProvider;
  action: SubscriptionActionType;
}


export const OrderType = {
  ORDER: "order",
  SUBSCRIPTION: "subscription",
} as const;

// ProviderId has different meaning according to the order type. For ORDER, it is the provider's order_id. For SUBSCRIPTION, it is the provider's subscription_id.
const CheckoutSubscriptionResponseSchema = z.discriminatedUnion("type", [
  z.object({
    key: z.string(),
    subscription_id: z.string(),
    provider_id: z.string(),
    type: z.literal(OrderType.ORDER), // subscription
    amount: z.number(),
    currency: z.string(),
  }),

  z.object({
    key: z.string(),
    subscription_id: z.string(),
    provider_id: z.string(),
    provider_plan_id: z.string(),
    type: z.literal(OrderType.SUBSCRIPTION), // subscription
  }),
]);

export type CheckoutSubscriptionResponse = z.infer<typeof CheckoutSubscriptionResponseSchema>;



const verifyPaymentSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal(PaymentProvider.RAZORPAY),
    signature: z.string(),
    payment_id: z.string(),
    subscription_id: z.string(),
  }),
  z.object({
    provider: z.literal(PaymentProvider.PAYPAL),
    payment_id: z.string(),
    subscription_id: z.string(),
  }),
]);

export type VerifyPayment = z.infer<typeof verifyPaymentSchema>;

export const PaymentStatus = {
  SUCCESS: "success",
  PENDING: "pending",
  FAILED: "failed",
} as const;

export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus];

export type VerifyPaymentResponse = {
  status: PaymentStatusType;
  message?: string;
}


// ------------------- User Subscription ------------------- //

export type UserSubscription = {
  sub_id: string
  plan: Plan
  billing_interval: BillingIntervalType
  status: string
  auto_pay_cancelled_at: string | null
  is_grace_period: boolean
  subscribed_from: string | null
  subscription_ends_at: string | null
  credit_balance: number
  credit_currency: "INR" | "USD"
}



// ------------------- User Usage Quotas ------------------- //
export type QuotaUsage = {
  limit: number;
  used: number;
}

export interface Quotas {
  job_quota: QuotaUsage;
  jd_creation_quota: QuotaUsage;
  application_sourced_quota: QuotaUsage;
  resume_parsing_quota: QuotaUsage;
  resume_scoring_quota: QuotaUsage;
  voice_call_quota: QuotaUsage;
  interview_quota: QuotaUsage;
}

export interface UserMonthlyUsage {
  start: string;
  end: string;
  quotas: Quotas;
}