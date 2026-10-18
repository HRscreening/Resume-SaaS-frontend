import { describe, expect, it } from "vitest";
import { parseQuestionSignal, reconcileDeadline, shouldClearDeadline } from "./questionDeadline";

describe("parseQuestionSignal", () => {
  it("reads id and remaining seconds", () =>
    expect(parseQuestionSignal('{"index":1,"question_id":"q2","remaining_s":90}')).toEqual({ questionId: "q2", remainingS: 90, walkthrough: false }));
  it("treats a missing or non-numeric remaining_s as null", () =>
    expect(parseQuestionSignal('{"question_id":"q2"}')).toEqual({ questionId: "q2", remainingS: null, walkthrough: false }));
  it("rejects a payload without a string id", () => expect(parseQuestionSignal('{"remaining_s":5}')).toBeNull());
  it("rejects malformed JSON", () => expect(parseQuestionSignal("not json")).toBeNull());
  it("reads walkthrough true", () =>
    expect(parseQuestionSignal('{"question_id":"q2","walkthrough":true}')?.walkthrough).toBe(true));
  it("reads walkthrough false", () =>
    expect(parseQuestionSignal('{"question_id":"q2","walkthrough":false}')?.walkthrough).toBe(false));
  it("treats a missing walkthrough (an older agent) as false", () =>
    expect(parseQuestionSignal('{"question_id":"q2"}')?.walkthrough).toBe(false));
  it("treats a non-boolean walkthrough as false", () => {
    for (const v of ['"true"', "1", "null", "{}"]) {
      expect(parseQuestionSignal(`{"question_id":"q2","walkthrough":${v}}`)?.walkthrough).toBe(false);
    }
  });
});

describe("reconcileDeadline", () => {
  it("keeps the local deadline when the server sends none", () => expect(reconcileDeadline(5000, null, 1000)).toBe(5000));
  it("adopts the server deadline when there is none locally", () => expect(reconcileDeadline(null, 90, 1000)).toBe(91000));
  it("ignores drift under the threshold", () => expect(reconcileDeadline(91000, 88, 1000)).toBe(91000));
  it("realigns on drift over the threshold", () => expect(reconcileDeadline(91000, 80, 1000)).toBe(81000));
});

describe("shouldClearDeadline", () => {
  it("clears when the server drops its clock for the same question", () => expect(shouldClearDeadline(42, null)).toBe(true));
  it("keeps the local fallback when the server never had a clock", () => expect(shouldClearDeadline(null, null)).toBe(false));
  it("keeps the deadline while the server clock runs", () => expect(shouldClearDeadline(42, 37)).toBe(false));
  it("keeps the deadline when the server clock appears", () => expect(shouldClearDeadline(null, 37)).toBe(false));
});
