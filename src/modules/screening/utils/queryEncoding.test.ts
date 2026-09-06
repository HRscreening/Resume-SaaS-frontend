import { describe, it, expect } from "vitest";
import { buildApplicationFiltersBody, buildScreeningFiltersBody } from "./queryEncoding";
import { DEFAULT_MIN, DEFAULT_MAX } from "@/modules/screening/types/searchSchema";

/**
 * The experience range always has a value, because the schema defaults it so
 * the slider can render. Sending it unconditionally turned an untouched slider
 * into a filter: in production a job holding 44 resumes showed 3 candidates,
 * because the default capped experience at 20 years and the rest of the
 * applicants had longer careers.
 */
describe("experience range is only a filter once someone sets it", () => {
  it("omits exp when the range covers everything", () => {
    const body = buildApplicationFiltersBody({
      appType: "Active",
      appExperience: { min: DEFAULT_MIN, max: DEFAULT_MAX },
    } as never);
    expect(body.exp).toBeUndefined();
  });

  it("sends exp once the range is narrowed", () => {
    const body = buildApplicationFiltersBody({
      appType: "Active",
      appExperience: { min: 5, max: 12 },
    } as never);
    expect(body.exp).toEqual({ min: 5, max: 12 });
  });

  it("treats a raised floor as a real filter", () => {
    const body = buildApplicationFiltersBody({
      appType: "Active",
      appExperience: { min: 10, max: DEFAULT_MAX },
    } as never);
    expect(body.exp).toEqual({ min: 10, max: DEFAULT_MAX });
  });

  it("applies the same rule to the screening tab", () => {
    const wide = buildScreeningFiltersBody({
      screenType: "Active",
      sExp: { min: DEFAULT_MIN, max: DEFAULT_MAX },
    } as never);
    expect(wide.exp).toBeUndefined();

    const narrowed = buildScreeningFiltersBody({
      screenType: "Active",
      sExp: { min: 0, max: 15 },
    } as never);
    expect(narrowed.exp).toEqual({ min: 0, max: 15 });
  });

  it("keeps a range that reaches the old 20 year cap as a real filter", () => {
    // Guards the fix itself: 20 must no longer read as "everything".
    const body = buildApplicationFiltersBody({
      appType: "Active",
      appExperience: { min: 0, max: 20 },
    } as never);
    expect(body.exp).toEqual({ min: 0, max: 20 });
  });
});

describe("the slider can express a senior search", () => {
  it("reaches well past twenty years", () => {
    expect(DEFAULT_MAX).toBeGreaterThanOrEqual(40);
  });
});
