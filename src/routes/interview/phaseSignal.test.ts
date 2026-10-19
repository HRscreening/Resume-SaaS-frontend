import { describe, expect, it } from "vitest";

import { fiveMinuteNotice, parsePhaseSignal, phaseLabel } from "./phaseSignal";

describe("parsePhaseSignal", () => {
  it("reads a known phase and the ending flag", () => {
    expect(parsePhaseSignal('{"phase":"closing","ending":true,"end_reason":"completed"}')).toEqual({
      phase: "closing",
      ending: true,
    });
    expect(parsePhaseSignal('{"phase":"opening"}')).toEqual({ phase: "opening", ending: false });
  });

  it("returns null for junk, an unknown phase, or a non-object", () => {
    expect(parsePhaseSignal("nope")).toBeNull();
    expect(parsePhaseSignal('{"phase":"lunch"}')).toBeNull();
    expect(parsePhaseSignal("[1]")).toBeNull();
    expect(parsePhaseSignal('{"phase":"spoken","ending":"true"}')).toEqual({ phase: "spoken", ending: false });
  });
});

describe("phaseLabel", () => {
  it("names only the phases the question counter cannot", () => {
    expect(phaseLabel("opening")).toBe("Warm-up");
    expect(phaseLabel("closing")).toBe("Your questions");
    for (const phase of ["spoken", "coding", "walkthrough"] as const) expect(phaseLabel(phase)).toBeNull();
    expect(phaseLabel(null)).toBeNull();
  });
});

describe("fiveMinuteNotice", () => {
  it("shows for thirty seconds after crossing five minutes on a long question", () => {
    expect(fiveMinuteNotice(300, 8, true)).toBe(true);
    expect(fiveMinuteNotice(271, 8, true)).toBe(true);
    expect(fiveMinuteNotice(270, 8, true)).toBe(false);
    expect(fiveMinuteNotice(301, 8, true)).toBe(false);
  });

  it("never shows on a short question, or without a running timer", () => {
    expect(fiveMinuteNotice(300, 5, true)).toBe(false);
    expect(fiveMinuteNotice(300, undefined, true)).toBe(false);
    expect(fiveMinuteNotice(300, 8, false)).toBe(false);
  });
});
