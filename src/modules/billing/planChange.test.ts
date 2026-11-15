import { describe, expect, it, vi } from "vitest";

import { classifyChange, pollUntilPlanActive, type ChangeSubscriptionState } from "./planChange";

const NOW = new Date("2026-11-15T12:00:00Z");
const DAY_MS = 86_400_000;
const inDays = (days: number) => new Date(NOW.getTime() + days * DAY_MS).toISOString();

function sub(
  plan: string,
  interval: "monthly" | "yearly",
  status = "active",
  endsAt: string | null = inDays(10),
): ChangeSubscriptionState {
  return { plan, billing_interval: interval, status, subscription_ends_at: endsAt };
}

// Same rows as backend/tests/test_plan_change_classify.py.
const ROWS: [string, ChangeSubscriptionState | null, string, "monthly" | "yearly", string][] = [
  ["no subscription", null, "PLUS", "monthly", "new"],
  ["higher plan", sub("LITE", "monthly"), "PLUS", "monthly", "upgrade"],
  ["monthly to yearly", sub("LITE", "monthly"), "LITE", "yearly", "upgrade"],
  ["yearly to monthly", sub("LITE", "yearly"), "LITE", "monthly", "downgrade"],
  ["lower plan", sub("PRO", "monthly"), "LITE", "monthly", "downgrade"],
  ["same plan and interval", sub("LITE", "monthly"), "LITE", "monthly", "already_on_plan"],
  ["expired", sub("LITE", "monthly", "expired"), "LITE", "monthly", "new"],
  ["grace is not live", sub("LITE", "monthly", "active", inDays(-1)), "PLUS", "monthly", "new"],
  ["cancelled but live", sub("PLUS", "monthly", "cancelled"), "PRO", "monthly", "upgrade"],
  ["waiting cancellation is live", sub("PLUS", "monthly", "waiting_cancellation"), "PRO", "monthly", "upgrade"],
  ["free target (subscribed)", sub("LITE", "monthly"), "FREE", "monthly", "not_self_serve"],
  ["free target (none)", null, "FREE", "monthly", "not_self_serve"],
  ["enterprise target", sub("LITE", "monthly"), "ENTERPRISE", "monthly", "not_self_serve"],
  ["unlimited target", sub("LITE", "monthly"), "UNLIMITED", "monthly", "not_self_serve"],
  ["business target", sub("LITE", "monthly"), "BUSINESS", "monthly", "not_self_serve"],
  ["business current ranks as plus", sub("BUSINESS", "monthly"), "PRO", "monthly", "upgrade"],
  ["status case does not matter", sub("LITE", "monthly", "ACTIVE"), "PLUS", "monthly", "upgrade"],
  ["live without an end date is not live", sub("LITE", "monthly", "active", null), "PLUS", "monthly", "new"],
];

describe("classifyChange", () => {
  it.each(ROWS)("%s", (_name, current, plan, interval, expected) => {
    expect(classifyChange(current, plan, interval, NOW)).toBe(expected);
  });
});

describe("pollUntilPlanActive", () => {
  const noSleep = () => Promise.resolve();
  const options = { intervalMs: 2000, timeoutMs: 30_000, sleep: noSleep };

  it("resolves true as soon as the purchased plan is active", async () => {
    const fetchSubscription = vi
      .fn()
      .mockResolvedValueOnce(sub("LITE", "monthly"))
      .mockResolvedValueOnce(sub("PLUS", "monthly"));
    await expect(pollUntilPlanActive(fetchSubscription, "PLUS", options)).resolves.toBe(true);
    expect(fetchSubscription).toHaveBeenCalledTimes(2);
  });

  it("keeps polling through a fetch error and gives up after the timeout", async () => {
    const fetchSubscription = vi.fn().mockRejectedValue(new Error("network"));
    await expect(pollUntilPlanActive(fetchSubscription, "PLUS", options)).resolves.toBe(false);
    // 30s at 2s steps: one attempt per step including the first.
    expect(fetchSubscription).toHaveBeenCalledTimes(15);
  });
});
