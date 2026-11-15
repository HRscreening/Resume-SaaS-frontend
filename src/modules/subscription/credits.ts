import type { UserMonthlyUsage } from "@/types/subscription.type";

// Decimals may arrive from the API as strings; anything unparseable counts as 0.
export function toCredit(value: number | string | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export type CreditBalance = {
  planAllocated: number;
  planUsed: number;
  planRemaining: number;
  additionalAllocated: number;
  additionalUsed: number;
  additionalRemaining: number;
  totalAllocated: number;
  totalUsed: number;
  totalRemaining: number;
};

// The plan bucket and the additional pool, each floored at zero remaining.
export function creditBalance(usage: UserMonthlyUsage): CreditBalance {
  const planAllocated = toCredit(usage.credit_allocated);
  const planUsed = toCredit(usage.credit_used);
  const additionalAllocated = toCredit(usage.additional_allocated);
  const additionalUsed = toCredit(usage.additional_used);
  const planRemaining = Math.max(planAllocated - planUsed, 0);
  const additionalRemaining = Math.max(additionalAllocated - additionalUsed, 0);
  return {
    planAllocated,
    planUsed,
    planRemaining,
    additionalAllocated,
    additionalUsed,
    additionalRemaining,
    totalAllocated: planAllocated + additionalAllocated,
    totalUsed: planUsed + additionalUsed,
    totalRemaining: planRemaining + additionalRemaining,
  };
}
