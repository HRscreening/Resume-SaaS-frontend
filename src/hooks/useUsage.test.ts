import { describe, it, expect } from "vitest";
import { deriveUsageView } from "./useUsage";

describe("deriveUsageView", () => {
  it("treats a missing response as limited, so limits never flash off", () => {
    expect(deriveUsageView(undefined).unlimited).toBe(false);
  });
  it("reads the server flag", () => {
    expect(deriveUsageView({ unlimited: true } as never).unlimited).toBe(true);
  });
  it("never derives unlimited from a negative limit alone", () => {
    // The sentinel must not leak into the client as a rendering rule.
    expect(deriveUsageView({ unlimited: false, quota_limit: -1 } as never).unlimited).toBe(false);
  });
  it("exposes totals as an array even when absent", () => {
    expect(deriveUsageView({} as never).totals).toEqual([]);
  });
});
