// Contains Both Billing and Subscription related types and constants. 

import { z } from "zod";


export type Plan = "LITE" | "PRO" | "PLUS" // only these two plans are available for subscription

export type DwongradablePlan = Plan | "FREE"

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
  is_resumable:boolean
  cancelled_at: string | null
  subscribed_from: string | null
  subscription_ends_at: string | null
  credit_balance: number
  credit_unit?: "INR" | "USD" | string
  scheduled_downgrade_plan?: Plan | null
}



// ------------------- User Usage Quotas ------------------- //
// Feature counts for the current cycle. Limits live on the credit pool, not per feature.
export type QuotaUsage = {
  jobs_created: number;
  resume_parsing: number;
  resume_scoring: number;
  sourced_candidates: number;
  voice_screen: number;
  interview: number;
}

export interface UserMonthlyUsage {
  id: string;
  start: string;
  end: string;
  is_expired: boolean;
  is_grace_period: boolean;
  // Decimals may arrive as strings from the API.
  credit_allocated: number | string;
  credit_used: number | string;
  additional_allocated: number | string;
  additional_used: number | string;
  usage: QuotaUsage;
}

export const CreditTransactionType = {
  DEBIT: "debit",
  CREDIT: "credit",
  REFUND: "refund",
  ADJUSTMENT: "adjustment",
} as const;

export type CreditTransactionTypeValue =
  (typeof CreditTransactionType)[keyof typeof CreditTransactionType];

export interface CreditLog {
  transaction_type: CreditTransactionTypeValue | string;
  credit: number | string;
  feature: string | null;
  desc: string | null;
}