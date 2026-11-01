import { describe, expect, it } from "vitest";

import { minutesLeft, railSteps, stepProgress } from "./rail";

const QUESTIONS = [
  { id: "a", kind: "spoken" as const, allocated_minutes: 5 },
  { id: "b", kind: "coding" as const, allocated_minutes: 15 },
  { id: "c", kind: "spoken" as const, allocated_minutes: 6 },
];

function statuses(steps: ReturnType<typeof railSteps>) {
  return steps.map((s) => s.status);
}

describe("railSteps", () => {
  it("starts on the warm-up before any question is named", () => {
    const steps = railSteps({ questions: QUESTIONS, index: -1, finished: false, phase: "opening" });
    expect(steps.map((s) => s.label)).toEqual([
      "Warm-up",
      "Question 1 · Spoken",
      "Question 2 · Coding",
      "Question 3 · Spoken",
      "Your questions",
    ]);
    expect(statuses(steps)).toEqual(["current", "upcoming", "upcoming", "upcoming", "upcoming"]);
  });

  it("marks earlier questions done and the pointer's question current", () => {
    const steps = railSteps({ questions: QUESTIONS, index: 1, finished: false, phase: "coding" });
    expect(statuses(steps)).toEqual(["done", "done", "current", "upcoming", "upcoming"]);
    expect(steps[2].minutes).toBe(15);
  });

  it("moves to the candidate's questions once the server says closing", () => {
    const steps = railSteps({ questions: QUESTIONS, index: 2, finished: false, phase: "closing" });
    expect(statuses(steps)).toEqual(["done", "done", "done", "done", "current"]);
  });

  it("treats a finished last question as closing even before the phase arrives", () => {
    const steps = railSteps({ questions: QUESTIONS, index: 2, finished: true, phase: "spoken" });
    expect(statuses(steps)).toEqual(["done", "done", "done", "done", "current"]);
  });

  it("flags the walkthrough on the current coding question only", () => {
    const steps = railSteps({ questions: QUESTIONS, index: 1, finished: false, phase: "walkthrough", walkthrough: true });
    expect(steps[2].note).toBe("Walking through your code");
    expect(steps.filter((s) => s.note).length).toBe(1);
  });

  it("returns just the warm-up and closing when there are no questions yet", () => {
    const steps = railSteps({ questions: [], index: -1, finished: false, phase: null });
    expect(steps.map((s) => s.key)).toEqual(["warmup", "closing"]);
  });
});

describe("stepProgress", () => {
  it("is the share of the question's time already used", () => {
    expect(stepProgress(5, 150)).toBeCloseTo(0.5);
  });

  it("is clamped to 0..1", () => {
    expect(stepProgress(5, 999)).toBe(0);
    expect(stepProgress(5, -10)).toBe(1);
    expect(stepProgress(0, 10)).toBe(0);
  });
});

describe("minutesLeft", () => {
  it("rounds up and never goes below zero", () => {
    expect(minutesLeft(60, 0, 0)).toBe(60);
    expect(minutesLeft(60, 0, 61_000)).toBe(59);
    expect(minutesLeft(60, 0, 3 * 3_600_000)).toBe(0);
  });

  it("shows the whole duration before the call connects", () => {
    expect(minutesLeft(45, null, 123)).toBe(45);
  });
});
