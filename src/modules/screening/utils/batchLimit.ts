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

/** What to tell a user whose selection is over the cap, or null if it fits. */
export function batchLimitMessage(selected: number, maxBatchSize: number | null): string | null {
  if (maxBatchSize === null || selected <= maxBatchSize) return null;
  const excess = selected - maxBatchSize;
  return `You selected ${selected} resumes. Your plan can screen up to ${maxBatchSize} at a time. Deselect ${excess} and try again.`;
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
