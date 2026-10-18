import { describe, expect, it } from "vitest";
import { shouldWarnSilence } from "./micSilence";

const base = { micMuted: false, agentListening: true, agentHasSpoken: true, lastHeardAtMs: 0, nowMs: 0 };

describe("shouldWarnSilence", () => {
  it("warns whenever the mic is muted", () => {
    expect(shouldWarnSilence({ ...base, micMuted: true, agentListening: false })).toBe(true);
  });
  it("warns after 20 s of silence while the agent listens", () => {
    expect(shouldWarnSilence({ ...base, nowMs: 19_999 })).toBe(false);
    expect(shouldWarnSilence({ ...base, nowMs: 20_000 })).toBe(true);
  });
  it("does not warn on silence when the agent is not listening", () => {
    expect(shouldWarnSilence({ ...base, agentListening: false, nowMs: 60_000 })).toBe(false);
  });
  it("does not warn when the candidate was heard recently", () => {
    expect(shouldWarnSilence({ ...base, lastHeardAtMs: 95_000, nowMs: 100_000 })).toBe(false);
  });
  it("does not warn before the interviewer has spoken, even if muted", () => {
    expect(shouldWarnSilence({ ...base, agentHasSpoken: false, micMuted: true, nowMs: 60_000 })).toBe(false);
  });
});
