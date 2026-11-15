import { describe, it, expect } from "vitest";
import { upgradeActionFor } from "./creditErrors";

class FakeApiError extends Error {
  constructor(readonly status: number, message: string, readonly code?: string) {
    super(message);
  }
}

describe("upgradeActionFor", () => {
  it.each(["FREE_CREDITS_EXHAUSTED", "CREDITS_EXHAUSTED", "INSUFFICIENT_CREDITS", "QUOTA_EXCEEDED"])(
    "offers Upgrade for %s",
    (code) => {
      expect(upgradeActionFor(new FakeApiError(402, "out", code))).toEqual({ label: "Upgrade", to: "/upgrade" });
    },
  );

  it("offers nothing for a retryable or unrelated refusal", () => {
    expect(upgradeActionFor(new FakeApiError(409, "changed", "CREDITS_CHANGED"))).toBeNull();
    expect(upgradeActionFor(new FakeApiError(400, "bad", "BATCH_SIZE_LIMIT"))).toBeNull();
    expect(upgradeActionFor(new Error("network down"))).toBeNull();
    expect(upgradeActionFor(undefined)).toBeNull();
  });
});
