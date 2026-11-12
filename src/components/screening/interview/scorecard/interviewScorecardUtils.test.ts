import { describe, expect, it } from "vitest";
import { responseTimeLabel } from "./interviewScorecardUtils";

describe("responseTimeLabel", () => {
  it("reads the felt wait and the first word", () => {
    expect(responseTimeLabel({
      e2e: { p50_ms: 1230, p95_ms: 2810, n: 14 },
      startup: { join_to_first_word_s: 1.42 },
    })).toBe("Replies in 1.2 s (p50) · 2.8 s (p95) · first word 1.4 s after joining");
  });

  it("copes with either half missing", () => {
    expect(responseTimeLabel({ e2e: { p50_ms: 900, n: 3 } })).toBe("Replies in 0.9 s");
    expect(responseTimeLabel({ startup: { join_to_first_word_s: 3 } })).toBe("first word 3.0 s after joining");
  });

  it("is null when nothing usable was recorded", () => {
    expect(responseTimeLabel(null)).toBeNull();
    expect(responseTimeLabel(undefined)).toBeNull();
    expect(responseTimeLabel({})).toBeNull();
    expect(responseTimeLabel({ e2e: { p50_ms: 900, n: 0 } })).toBeNull();
    expect(responseTimeLabel({ eou_delay: { p50_ms: 800, n: 5 } })).toBeNull();
  });
});
