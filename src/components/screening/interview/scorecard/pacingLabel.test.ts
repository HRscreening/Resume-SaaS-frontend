import { describe, expect, it } from "vitest";
import type { InterviewQuestionPacing } from "@/types";
import { pacingFor, pacingLabel, pacingTooltip } from "./pacingLabel";

function entry(reason: string, questionId: string | null = "q1"): InterviewQuestionPacing {
  return { question_id: questionId, index: 0, kind: "spoken", seconds: 60, budget_s: 120, reason, agent_turns: 2 };
}

describe("pacingLabel", () => {
  it("maps each known reason to its label", () => {
    expect(pacingLabel(entry("time_up"))).toBe("Time ran out");
    expect(pacingLabel(entry("submitted"))).toBe("Submitted");
    expect(pacingLabel(entry("model"))).toBe("Moved on");
    expect(pacingLabel(entry("follow_ups"))).toBe("Follow-ups done");
  });

  it("returns null for undefined or an unknown reason", () => {
    expect(pacingLabel(undefined)).toBeNull();
    expect(pacingLabel(entry("something_new"))).toBeNull();
  });
});

describe("pacingFor", () => {
  const list = [entry("model", "q1"), entry("time_up", "q2")];

  it("finds the entry by question id", () => {
    expect(pacingFor(list, "q2")).toBe(list[1]);
  });

  it("is undefined when absent or when pacing is undefined", () => {
    expect(pacingFor(list, "q9")).toBeUndefined();
    expect(pacingFor(undefined, "q1")).toBeUndefined();
  });
});

describe("pacingTooltip", () => {
  it("formats minutes spent against the budget", () => expect(pacingTooltip(entry("model"))).toBe("1 of 2 min"));
  it("is undefined when either number is not finite", () => {
    expect(pacingTooltip({ ...entry("model"), seconds: Number.NaN })).toBeUndefined();
    expect(pacingTooltip({ ...entry("model"), budget_s: "junk" as unknown as number })).toBeUndefined();
  });
});
