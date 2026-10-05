// A candidate sat a real coding question and could not run anything. The
// gate is one half of why (the other was layout): "Python is still
// loading" disabled the button outright, so pressing Run during the
// several seconds Pyodide needs did nothing at all.
import { describe, expect, it } from "vitest";
import { runGateFor } from "./runGate";

describe("runGateFor", () => {
  it("lets Run through once Python is ready", () => {
    expect(runGateFor("python", "ready")).toEqual({ blocked: false, note: null });
  });

  it("lets Run through WHILE Python is still loading", () => {
    // The regression. The run itself waits for the interpreter; the
    // candidate should not have to poll a dead button mid-interview.
    const gate = runGateFor("python", "loading");
    expect(gate.blocked).toBe(false);
    expect(gate.note).toMatch(/loading/i);
  });

  it("treats a not-yet-started interpreter as loading, not as broken", () => {
    expect(runGateFor("python", "idle").blocked).toBe(false);
  });

  it("blocks only when Python actually failed to load", () => {
    const gate = runGateFor("python", "error");
    expect(gate.blocked).toBe(true);
    expect(gate.note).toMatch(/could not be loaded/i);
  });

  it("never blocks JavaScript, whatever Python is doing", () => {
    // JS runs in its own throwaway worker and does not touch Pyodide.
    for (const status of ["idle", "loading", "ready", "error"] as const) {
      expect(runGateFor("javascript", status)).toEqual({ blocked: false, note: null });
    }
  });

  it("blocks C++ and says why", () => {
    const gate = runGateFor("cpp", "ready");
    expect(gate.blocked).toBe(true);
    expect(gate.note).toMatch(/C\+\+/);
  });

  it("does not block before a language is known", () => {
    expect(runGateFor(undefined, "ready").blocked).toBe(false);
  });
});
