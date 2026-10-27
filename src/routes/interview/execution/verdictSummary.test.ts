import { describe, expect, it } from "vitest";

import { isFullPass, verdictSummary } from "./verdictSummary";

const verdict = (edge: number, adversarial: number) => ({
  passed: 4 + edge + adversarial,
  total: 12,
  compile_error: null,
  by_category: {
    basic: { passed: 4, total: 4 },
    edge: { passed: edge, total: 5 },
    adversarial: { passed: adversarial, total: 3 },
  },
});

describe("verdictSummary", () => {
  it("says so plainly when everything passed", () => {
    const summary = verdictSummary(verdict(5, 3));
    expect(summary.tone).toBe("pass");
    expect(summary.headline).toBe("All 12 hidden checks passed.");
    expect(summary.detail).toBeNull();
  });

  it("names the categories still failing, and only those", () => {
    const summary = verdictSummary(verdict(3, 2));
    expect(summary.tone).toBe("partial");
    expect(summary.headline).toBe("9 of 12 hidden checks passed.");
    expect(summary.detail).toBe("Still failing: 2 edge cases, 1 adversarial case.");
  });

  it("reports a compile error as the candidate's own, with the compiler's text", () => {
    const summary = verdictSummary({ ...verdict(0, 0), passed: 0, compile_error: "expected ';'" });
    expect(summary.tone).toBe("error");
    expect(summary.headline).toBe("Your code did not compile.");
    expect(summary.detail).toBe("expected ';'");
  });

  it("does not present an unjudged save as a failure", () => {
    for (const missing of [null, undefined]) {
      const summary = verdictSummary(missing);
      expect(summary.tone).toBe("pending");
      expect(summary.headline).toBe("Saved. Your solution will be checked after the interview.");
    }
  });
});

describe("isFullPass", () => {
  it("is true only when every check passed", () => {
    expect(isFullPass(verdict(5, 3))).toBe(true);
    expect(isFullPass(verdict(5, 2))).toBe(false);
    expect(isFullPass({ ...verdict(5, 3), compile_error: "x" })).toBe(false);
    expect(isFullPass(null)).toBe(false);
  });
});
