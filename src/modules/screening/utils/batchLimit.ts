import type { PlanSpec, SubscriptionPlan } from "@/types";

/**
 * The plan's per-batch cap, or null when there is none to enforce here: the
 * catalog or profile has not loaded, the plan is not in the public catalog,
 * or the backend's no-limit sentinel (a negative number) is in force. Null
 * never blocks; the server stays the authority.
 */
export function resolveMaxBatchSize(
  plans: readonly PlanSpec[] | undefined,
  plan: SubscriptionPlan | undefined,
): number | null {
  const max = plans?.find((p) => p.key === plan)?.max_batch_size;
  return typeof max === "number" && max >= 0 ? max : null;
}

/**
 * The two limits the server applies to a Screen or Rescore request. Null
 * means unknown or uncapped, and never blocks.
 */
export interface ScreenLimits {
  /** Resumes allowed in one request. */
  maxBatchSize: number | null;
  /** Analyses left in the plan's allowance; each resume sent uses one. */
  quotaRemaining: number | null;
}

export type ScreenBlockReason = "batch_size" | "quota";

export interface ScreenBlock {
  reason: ScreenBlockReason;
  /** The most resumes that would be accepted right now. */
  allowed: number;
  /** Full sentence for the toast. */
  message: string;
  /** Short label shown beside the selected count. */
  hint: string;
}

/**
 * Why this selection would be refused, or null if it fits. When both limits
 * are exceeded the tighter one is reported, since meeting it meets both.
 */
export function screenBlock(selected: number, limits: ScreenLimits): ScreenBlock | null {
  const { maxBatchSize, quotaRemaining } = limits;
  const overBatch = maxBatchSize !== null && selected > maxBatchSize;
  const overQuota = quotaRemaining !== null && selected > quotaRemaining;
  if (!overBatch && !overQuota) return null;

  const quotaIsTighter = overQuota && (!overBatch || quotaRemaining < maxBatchSize);
  if (quotaIsTighter) {
    if (quotaRemaining === 0) {
      return {
        reason: "quota",
        allowed: 0,
        message: "You have no resume analyses left on your plan. Upgrade to screen more.",
        hint: "No analyses left",
      };
    }
    return {
      reason: "quota",
      allowed: quotaRemaining,
      message: `You selected ${selected} resumes but have ${quotaRemaining} analyses left on your plan. Deselect ${selected - quotaRemaining}, or upgrade to screen more.`,
      hint: `${quotaRemaining} analyses left`,
    };
  }

  const cap = maxBatchSize as number;
  return {
    reason: "batch_size",
    allowed: cap,
    message: `You selected ${selected} resumes. Your plan can screen up to ${cap} at a time. Deselect ${selected - cap} and try again.`,
    hint: `Max ${cap} per batch`,
  };
}

/**
 * A 4xx is the server refusing the request with a reason written for the
 * user (batch too large, quota spent), so it is shown as is. Anything else
 * is a fault whose detail would mean nothing to them.
 */
export function screeningErrorMessage(error: unknown, fallback: string): string {
  const status = (error as { status?: unknown } | null)?.status;
  const refused = typeof status === "number" && status >= 400 && status < 500;
  return refused && error instanceof Error && error.message ? error.message : fallback;
}
