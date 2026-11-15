// Client mirror of the server's classify_change
// (backend/app/modules/subscription/services/plan_change.py). Used only to
// label buttons; the server stays authoritative and re-checks every change.

import type { BillingIntervalType, ChangePreview } from "@/types/subscription.type";
import type { SubscriptionPlan } from "@/types";
import { formatMoney } from "@/lib/currency";
import { formatDate } from "@/lib/utils";

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
// Mirrors SubscriptionHelper.PLAN_ORDER on the server. BUSINESS is not in it (aliased to PLUS).
export const PLAN_ORDER: readonly SubscriptionPlan[] = ["FREE", "LITE", "PLUS", "PRO", "ENTERPRISE", "UNLIMITED"];
// BUSINESS is the legacy label for PLUS.
const LEGACY_ALIASES: Record<string, string> = { BUSINESS: "PLUS" };

export function isLive(current: ChangeSubscriptionState | null, now: Date): current is ChangeSubscriptionState {
  if (!current || !current.subscription_ends_at) return false;
  if (!LIVE_STATUSES.has(current.status.toLowerCase())) return false;
  return now.getTime() < new Date(current.subscription_ends_at).getTime();
}

function rank(plan: string): number {
  const key = plan.toUpperCase();
  return PLAN_ORDER.indexOf((LEGACY_ALIASES[key] ?? key) as SubscriptionPlan);
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
  // A plan the order does not know cannot be compared; leave it to support.
  if (currentRank < 0 || newRank < 0) return "not_self_serve";
  if (newRank !== currentRank) return newRank > currentRank ? "upgrade" : "downgrade";
  if (interval === current.billing_interval) return "already_on_plan";
  return interval === "yearly" ? "upgrade" : "downgrade";
}

/** What the poll reads: the classification slice plus the row id. */
export interface PolledSubscription extends ChangeSubscriptionState {
  sub_id: string;
}

/** The plan and interval just paid for. */
export interface PlanTarget {
  plan: string;
  billing_interval: BillingIntervalType;
}

/** The subscription as it was before payment; null when the user had none. */
export type SubscriptionSnapshot = Pick<PolledSubscription, "sub_id" | "subscription_ends_at"> | null;

/**
 * Active on the purchased plan and interval, and no longer the pre-payment row as it was:
 * an upgrade or new purchase gives a new row, a renewal moves the period end. Without the
 * snapshot check a same-plan purchase (monthly to yearly, renew in grace) would match the old row.
 */
function isSettled(sub: PolledSubscription, target: PlanTarget, before: SubscriptionSnapshot): boolean {
  if (sub.status.toLowerCase() !== "active") return false;
  if (sub.plan.toUpperCase() !== target.plan.toUpperCase()) return false;
  if (sub.billing_interval !== target.billing_interval) return false;
  return before === null || sub.sub_id !== before.sub_id || sub.subscription_ends_at !== before.subscription_ends_at;
}

interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  signal?: AbortSignal;
}

const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_POLL_TIMEOUT_MS = 30_000;
const realSleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal?.aborted) return resolve();
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal?.addEventListener("abort", done);
  });

/**
 * After a payment the plan switches when the provider webhook lands. Polls
 * until the purchase has settled (see isSettled); false on timeout.
 * A failed fetch counts as "not yet": the next attempt may succeed. An
 * aborted signal stops the loop early (also returning false).
 */
export async function pollUntilPlanActive(
  fetchSubscription: () => Promise<PolledSubscription | null>,
  target: PlanTarget,
  before: SubscriptionSnapshot,
  { intervalMs = DEFAULT_POLL_INTERVAL_MS, timeoutMs = DEFAULT_POLL_TIMEOUT_MS, sleep, signal }: PollOptions = {},
): Promise<boolean> {
  const attempts = Math.floor(timeoutMs / intervalMs);
  const wait = sleep ?? ((ms: number) => realSleep(ms, signal));
  for (let i = 0; i < attempts; i++) {
    if (signal?.aborted) return false;
    try {
      const sub = await fetchSubscription();
      if (sub && isSettled(sub, target, before)) return true;
    } catch (err) {
      console.warn("Subscription poll failed, retrying:", err);
    }
    await wait(intervalMs);
  }
  return false;
}

function formatCarryoverClause(preview: ChangePreview): string {
  const carryover = Number(preview.carryover_credits);
  if (!(carryover > 0) || !preview.carryover_expires_at) return "";
  return `, plus your ${carryover.toLocaleString()} unused credits until ${formatDate(preview.carryover_expires_at)}`;
}

/** The checkout explanation for an upgrade, all figures from the server preview. */
export function upgradeSummary(preview: ChangePreview, planName: string): string {
  const charge = formatMoney(Number(preview.charge_today.amount_major), preview.charge_today.currency);
  return (
    `Upgrade to ${planName}. You pay ${charge} today and your billing date moves to today. ` +
    `You get ${preview.credits_now.toLocaleString()} credits now${formatCarryoverClause(preview)}. ` +
    `You'll approve autopay for the new plan on the next screen.`
  );
}
