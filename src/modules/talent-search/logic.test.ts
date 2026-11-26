import { describe, expect, it } from "vitest";
import { avatarState, buildAnswers, formatMonths, providerNotice } from "./logic";
import type { ClarifyingQuestion } from "./types";

describe("avatarState", () => {
  it("shows the photo when present and not failed", () => {
    expect(avatarState("Asha Rao", "https://x/p.jpg", false)).toEqual({ kind: "img", initials: "AR" });
  });
  it("falls back to initials after an image error", () => {
    expect(avatarState("Asha Rao", "https://x/p.jpg", true)).toEqual({ kind: "initials", initials: "AR" });
  });
  it("uses initials without a photo and ignores masked surname characters", () => {
    expect(avatarState("Neha Ku***r", null, false)).toEqual({ kind: "initials", initials: "NK" });
  });
  it("renders a blank tile with no name", () => {
    expect(avatarState(null, null, false)).toEqual({ kind: "blank", initials: "" });
  });
});

describe("buildAnswers", () => {
  const questions: ClarifyingQuestion[] = [
    { field: "locations", question: "Where?", allow_other: true, options: [{ id: "o1", label: "Noida", description: "", patch: {} }] },
    { field: "min_years", question: "Years?", allow_other: true, options: [{ id: "o2", label: "5-8 years", description: "", patch: {} }] },
  ];
  it("sends the chosen option or the typed other text", () => {
    expect(buildAnswers(questions, { locations: { optionId: "o1" }, min_years: { other: " 6 years " } })).toEqual([
      { field: "locations", option_id: "o1" },
      { field: "min_years", other_text: "6 years" },
    ]);
  });
  it("skips unanswered questions and blank other text", () => {
    expect(buildAnswers(questions, { min_years: { other: "  " } })).toEqual([]);
  });
});

describe("formatMonths", () => {
  it.each([[86, "7y 2m"], [12, "1y"], [5, "5m"], [0, "0m"]])("formats %i months as %s", (months, text) => {
    expect(formatMonths(months)).toBe(text);
  });
});

describe("providerNotice", () => {
  it("names unavailable sources", () => {
    expect(providerNotice({ crustdata: "ok", apollo: "unavailable" })).toBe("1 source unavailable: Apollo");
  });
  it("is empty when all sources answered", () => {
    expect(providerNotice({ crustdata: "ok" })).toBe("");
  });
});

describe("search lifecycle helpers", () => {
  it("refreshes results only when a run finishes", async () => {
    const { finishedRun } = await import("./logic");
    expect(finishedRun("searching", "done")).toBe(true);
    expect(finishedRun("searching", "failed")).toBe(true);
    expect(finishedRun("done", "done")).toBe(false);
    expect(finishedRun(undefined, "done")).toBe(false);
  });

  it("stops polling once the run's time cap passes", async () => {
    const { shouldPoll } = await import("./logic");
    expect(shouldPoll("searching", 1_000, 5_000)).toBe(true);
    expect(shouldPoll("searching", 6_000, 5_000)).toBe(false);
    expect(shouldPoll("searching", 6_000, undefined)).toBe(true);
    expect(shouldPoll("done", 1_000, 5_000)).toBe(false);
  });
});
