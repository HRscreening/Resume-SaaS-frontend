import { describe, expect, it } from "vitest";
import type { InterviewQuestionPacing } from "@/types";
import { pacingFor, pacingLabel } from "./pacingLabel";

function entry(reason: string, questionId: string | null = "q1"): InterviewQuestionPacing {
  return { question_id: questionId, index: 0, kind: "spoken", seconds: 60, budget_s: 120, reason, agent_turns: 2 };
}

describe("pacingLabel", () => {
  it("maps each known reason to its label", () => {
    expect(pacingLabel(entry("time_up"))).toBe("Time ran out");
    expect(pacingLabel(entry("submitted"))).toBe("Submitted");
    expect(pacingLabel(entry("model"))).toBe("Moved on");
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
