// Client mirror of the server's classify_change
// (backend/app/modules/subscription/services/plan_change.py). Used only to
// label buttons; the server stays authoritative and re-checks every change.

import type { BillingIntervalType } from "@/types/subscription.type";

export type ChangeType = "upgrade" | "downgrade" | "new" | "already_on_plan" | "not_self_serve";

/** The slice of the user's subscription the classification needs. */
export interface ChangeSubscriptionState {
  plan: string;
  billing_interval: BillingIntervalType;
  status: string;
  subscription_ends_at: string | null;
}

// A paid period is running in these statuses. The grace window after it is not live.
const LIVE_STATUSES = new Set(["active", "cancelled", "waiting_cancellation"]);
const NOT_SELF_SERVE = new Set(["FREE", "ENTERPRISE", "UNLIMITED", "BUSINESS"]);
const PLAN_ORDER = ["FREE", "LITE", "PLUS", "PRO"];
// BUSINESS is the legacy label for PLUS.
const LEGACY_ALIASES: Record<string, string> = { BUSINESS: "PLUS" };

function isLive(current: ChangeSubscriptionState | null, now: Date): current is ChangeSubscriptionState {
  if (!current || !current.subscription_ends_at) return false;
  if (!LIVE_STATUSES.has(current.status.toLowerCase())) return false;
  return now.getTime() < new Date(current.subscription_ends_at).getTime();
}

function rank(plan: string): number {
  const key = plan.toUpperCase();
  return PLAN_ORDER.indexOf(LEGACY_ALIASES[key] ?? key);
}

export function classifyChange(
  current: ChangeSubscriptionState | null,
  plan: string,
  interval: BillingIntervalType,
  now: Date,
): ChangeType {
  if (NOT_SELF_SERVE.has(plan.toUpperCase())) return "not_self_serve";
  if (!isLive(current, now)) return "new";

  const currentRank = rank(current.plan);
  const newRank = rank(plan);
  if (newRank !== currentRank) return newRank > currentRank ? "upgrade" : "downgrade";
  if (interval === current.billing_interval) return "already_on_plan";
  return interval === "yearly" ? "upgrade" : "downgrade";
}

interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_POLL_TIMEOUT_MS = 30_000;
const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * After a payment the plan switches when the provider webhook lands. Polls
 * until the subscription is active on the purchased plan; false on timeout.
 * A failed fetch counts as "not yet": the next attempt may succeed.
 */
export async function pollUntilPlanActive(
  fetchSubscription: () => Promise<ChangeSubscriptionState | null>,
  plan: string,
  { intervalMs = DEFAULT_POLL_INTERVAL_MS, timeoutMs = DEFAULT_POLL_TIMEOUT_MS, sleep = realSleep }: PollOptions = {},
): Promise<boolean> {
  const attempts = Math.floor(timeoutMs / intervalMs);
  for (let i = 0; i < attempts; i++) {
    try {
      const sub = await fetchSubscription();
      if (sub && sub.status.toLowerCase() === "active" && sub.plan.toUpperCase() === plan.toUpperCase()) {
        return true;
      }
    } catch (err) {
      console.warn("Subscription poll failed, retrying:", err);
    }
    await sleep(intervalMs);
  }
  return false;
}
