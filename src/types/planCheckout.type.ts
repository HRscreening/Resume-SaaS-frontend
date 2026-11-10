import type { Plan, PaymentProviderType, SubscriptionActionType } from "./subscription.type";

export interface CheckoutQuoteResponse {
  // Pricing
  currency: string;
  amount_minor: number;
  amount_major: number;
  usd_amount: number;
  fx_rate: number | null;

  // Subscription action & gateway
  actionable: SubscriptionActionType;
  gateway: PaymentProviderType;

  // Plan display details (so frontend doesn't need a separate getPlans call)
  plan_key: Plan;
  display_name: string;
  display_features: string[];
  max_resumes_per_month: number;
  quota_period: "monthly" | "lifetime";
  price_monthly_usd: number;
  yearly_price_monthly_usd: number | null;
}