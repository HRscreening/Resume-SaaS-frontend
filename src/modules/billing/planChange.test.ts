import { describe, expect, it, vi } from "vitest";

import { formatMoney } from "@/lib/currency";
import type { ChangePreview } from "@/types/subscription.type";
import { classifyChange, pollUntilPlanActive, upgradeSummary, type ChangeSubscriptionState } from "./planChange";

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
  ["enterprise current to lite", sub("ENTERPRISE", "monthly"), "LITE", "monthly", "downgrade"],
  ["unlimited current to pro", sub("UNLIMITED", "monthly"), "PRO", "monthly", "downgrade"],
  ["unknown current plan", sub("MYSTERY", "monthly"), "PRO", "monthly", "not_self_serve"],
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

  it("stops early once aborted", async () => {
    const controller = new AbortController();
    const fetchSubscription = vi.fn().mockImplementation(async () => {
      controller.abort();
      return sub("LITE", "monthly");
    });
    await expect(
      pollUntilPlanActive(fetchSubscription, "PLUS", { ...options, signal: controller.signal }),
    ).resolves.toBe(false);
    expect(fetchSubscription).toHaveBeenCalledTimes(1);
  });
});

describe("upgradeSummary", () => {
  const preview = (carryover: string, expires: string | null): ChangePreview => ({
    change_type: "upgrade",
    blocked_reason: null,
    blocked_message: null,
    effective_at: "2026-11-15T12:00:00Z",
    charge_today: { amount_major: "194.00", currency: "USD" },
    credits_now: 2100,
    carryover_credits: carryover,
    carryover_expires_at: expires,
    next_renewal_at: "2026-12-15T12:00:00Z",
    requires_authorisation: true,
    features_lost: [],
  });
  const charge = formatMoney(194, "USD");

  it("omits the carryover clause at zero", () => {
    const text = upgradeSummary(preview("0", null), "Plus");
    expect(text).toContain(`You pay ${charge} today`);
    expect(text).toContain("You get 2,100 credits now. You'll approve");
    expect(text).not.toContain("unused");
  });

  it("adds the carryover and its expiry date", () => {
    const text = upgradeSummary(preview("300", "2026-12-15T12:00:00Z"), "Plus");
    expect(text).toContain("credits now, plus your 300 unused credits until Dec 15, 2026.");
  });

  it("omits the clause when there is no expiry date", () => {
    expect(upgradeSummary(preview("300", null), "Plus")).not.toContain("unused");
  });
});
