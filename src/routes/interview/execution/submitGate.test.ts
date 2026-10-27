// Submit should mean "I checked this", not "I typed something": a real
// candidate submitted a Two Sum answer that printed nothing and had never
// been run. The gate must never trap anyone, though — if the language
// cannot be run here at all, Submit is their only way to finish.
import { describe, expect, it } from "vitest";
import { submitGateFor } from "./submitGate";
import type { RunCodeResponse } from "@/lib/interviewApi";

const result = (over: Partial<RunCodeResponse> = {}): RunCodeResponse => ({
  results: [], compile_error: null, ran: 3, passed: 3, ...over,
});

const gate = (over = {}) =>
  submitGateFor({ runnable: true, isRunning: false, runResult: null, ...over });

describe("submitGateFor", () => {
  it("blocks before anything has been run", () => {
    const g = gate();
    expect(g.blocked).toBe(true);
    expect(g.note).toMatch(/run your code first/i);
  });

  it("unlocks once every example passes", () => {
    expect(gate({ runResult: result() })).toEqual({ blocked: false, note: null });
  });

  it("stays blocked while examples are still failing, and says how many", () => {
    const g = gate({ runResult: result({ ran: 3, passed: 1 }) });
    expect(g.blocked).toBe(true);
    expect(g.note).toContain("2 of 3");
  });

  it("stays blocked on a compile error", () => {
    expect(gate({ runResult: result({ compile_error: "boom" }) }).blocked).toBe(true);
  });

  it("blocks while a run is in flight", () => {
    expect(gate({ isRunning: true, runResult: result() }).blocked).toBe(true);
  });

  it("phrases a single failing run as a run, not as examples", () => {
    // The no-examples case: one bare run that crashed.
    const g = gate({ runResult: result({ ran: 1, passed: 0 }) });
    expect(g.note).toMatch(/did not run cleanly/i);
    expect(g.note).not.toMatch(/examples/i);
  });

  it("unlocks on a clean bare run when the question has no examples", () => {
    expect(gate({ runResult: result({ ran: 1, passed: 1 }) }).blocked).toBe(false);
  });

  describe("never traps a candidate who cannot run anything", () => {
    it("stands down entirely when the language has no runner", () => {
      // C++, or Pyodide failed to load. Submit is the only way out of the
      // question by hand; requiring a run that cannot happen is a dead end.
      expect(submitGateFor({ runnable: false, isRunning: false, runResult: null }))
        .toEqual({ blocked: false, note: null });
    });

    it("stays down even after a failing run", () => {
      expect(submitGateFor({
        runnable: false, isRunning: false, runResult: result({ ran: 3, passed: 0 }),
      }).blocked).toBe(false);
    });
  });
});
