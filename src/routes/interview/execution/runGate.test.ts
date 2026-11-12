// A candidate sat a real coding question and could not run anything. The
// gate is one half of why (the other was layout): "Python is still
// loading" disabled the button outright, so pressing Run during the
// several seconds Pyodide needs did nothing at all.
import { describe, expect, it } from "vitest";
import { runGateFor } from "./runGate";

describe("runGateFor", () => {
  it("has nothing to say once Python is ready", () => {
    expect(runGateFor("python", "ready")).toEqual({ canSucceed: true, note: null });
  });

  it("notes that Python is still loading, without standing in Run's way", () => {
    // The regression. The run itself waits for the interpreter; the
    // candidate should not have to poll a dead button mid-interview.
    expect(runGateFor("python", "loading").note).toMatch(/loading/i);
    expect(runGateFor("python", "idle").note).toMatch(/loading/i);
  });

  it("asks for a retry after a failed load", () => {
    // A single bad moment at interview start used to kill Run for the
    // whole hour: status went to error and nothing could ever clear it.
    expect(runGateFor("python", "error").note).toMatch(/try loading it again/i);
  });

  it("does not pretend a failed load can succeed", () => {
    // What the Submit gate reads, so it never demands a passing run the
    // candidate has no way to produce.
    expect(runGateFor("python", "error").canSucceed).toBe(false);
    expect(runGateFor("python", "loading").canSucceed).toBe(true);
  });

  it("never worries about JavaScript, whatever Python is doing", () => {
    // JS runs in its own throwaway worker and does not touch Pyodide.
    for (const status of ["idle", "loading", "ready", "error"] as const) {
      expect(runGateFor("javascript", status)).toEqual({ canSucceed: true, note: null });
    }
  });

  it("has nothing to say before a language is known", () => {
    expect(runGateFor(undefined, "ready")).toEqual({ canSucceed: true, note: null });
  });
});
