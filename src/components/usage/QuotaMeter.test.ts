/**
 * Threshold logic for the allowance meters. Both the resume and the voice
 * meter run through this, which is the point: duplicating the block per
 * allowance is how "running low" ends up meaning 80% in one place and 90%
 * in another.
 */
import { describe, expect, it } from "vitest";

import { meterColor, usedRatio, WARN_AT } from "./QuotaMeter";

describe("usedRatio", () => {
  it("is the fraction spent", () => {
    expect(usedRatio(25, 100)).toBe(0.25);
  });

  it("clamps above the cap so an overshoot cannot render past 100%", () => {
    // Enforcement allows a small overshoot on voice calls: concurrent dials
    // can pass the check before any of them connects.
    expect(usedRatio(35, 30)).toBe(1);
  });

  it("treats a zero cap as empty rather than dividing by zero", () => {
    expect(usedRatio(0, 0)).toBe(0);
    expect(Number.isFinite(usedRatio(5, 0))).toBe(true);
  });
});

describe("meterColor", () => {
  it("is neutral below the warning threshold", () => {
    expect(meterColor(79, 100)).toBe("bg-[#0F0F0F]");
  });

  it("warns at exactly the threshold, not just past it", () => {
    expect(meterColor(WARN_AT * 100, 100)).toBe("bg-amber-500");
  });

  it("goes red only when the allowance is actually gone", () => {
    expect(meterColor(99, 100)).toBe("bg-amber-500");
    expect(meterColor(100, 100)).toBe("bg-red-500");
  });

  it("stays red on an overshoot", () => {
    expect(meterColor(31, 30)).toBe("bg-red-500");
  });

  it("skips amber entirely on Free's 3-call allowance", () => {
    // 2 of 3 is 67%, under the 80% threshold, so the meter goes neutral →
    // red with no warning in between. That is a consequence of a percentage
    // threshold on a tiny allowance, not a bug: "running low" at 2.4 calls
    // would be noise. Documented here so it is a decision, not a surprise.
    expect(meterColor(1, 3)).toBe("bg-[#0F0F0F]");
    expect(meterColor(2, 3)).toBe("bg-[#0F0F0F]");
    expect(meterColor(3, 3)).toBe("bg-red-500");
  });

  it("does warn on the larger voice allowances", () => {
    expect(meterColor(24, 30)).toBe("bg-amber-500"); // Plus, 80%
    expect(meterColor(80, 100)).toBe("bg-amber-500"); // Pro, 80%
  });
});
