import type { SubscriptionPlan } from "@/types";

// Customer-facing plan names. BUSINESS is the legacy key for Plus.
export const PLAN_LABEL: Record<SubscriptionPlan, string> = {
  FREE: "Free",
  PRO: "Pro",
  PLUS: "Plus",
  LITE: "Lite",
  BUSINESS: "Plus",
  ENTERPRISE: "Enterprise",
  UNLIMITED: "Unlimited",
};
