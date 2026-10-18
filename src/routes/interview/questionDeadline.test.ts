import { describe, expect, it } from "vitest";
import { parseQuestionSignal, reconcileDeadline } from "./questionDeadline";

describe("parseQuestionSignal", () => {
  it("reads id and remaining seconds", () =>
    expect(parseQuestionSignal('{"index":1,"question_id":"q2","remaining_s":90}')).toEqual({ questionId: "q2", remainingS: 90 }));
  it("treats a missing or non-numeric remaining_s as null", () =>
    expect(parseQuestionSignal('{"question_id":"q2"}')).toEqual({ questionId: "q2", remainingS: null }));
  it("rejects a payload without a string id", () => expect(parseQuestionSignal('{"remaining_s":5}')).toBeNull());
  it("rejects malformed JSON", () => expect(parseQuestionSignal("not json")).toBeNull());
});

describe("reconcileDeadline", () => {
  it("keeps the local deadline when the server sends none", () => expect(reconcileDeadline(5000, null, 1000)).toBe(5000));
  it("adopts the server deadline when there is none locally", () => expect(reconcileDeadline(null, 90, 1000)).toBe(91000));
  it("ignores drift under the threshold", () => expect(reconcileDeadline(91000, 88, 1000)).toBe(91000));
  it("realigns on drift over the threshold", () => expect(reconcileDeadline(91000, 80, 1000)).toBe(81000));
});
