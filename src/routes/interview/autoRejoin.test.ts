import { describe, expect, it } from "vitest";

import { REJOIN_WINDOW_MS, rejoinDelayMs, shouldKeepRejoining } from "./autoRejoin";

describe("rejoinDelayMs", () => {
  it("retries quickly at first, then settles", () => {
    expect([0, 1, 2, 3, 10].map(rejoinDelayMs)).toEqual([1000, 2000, 4000, 5000, 5000]);
  });
});

describe("shouldKeepRejoining", () => {
  it("retries for as long as the interviewer holds the interview", () => {
    expect(shouldKeepRejoining(0, REJOIN_WINDOW_MS - 1)).toBe(true);
    expect(shouldKeepRejoining(0, REJOIN_WINDOW_MS)).toBe(false);
  });

  it("does nothing when the connection was never lost", () => {
    expect(shouldKeepRejoining(null, 5)).toBe(false);
  });
});
