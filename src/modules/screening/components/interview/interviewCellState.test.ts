// The bug this pins: a candidate finished a full interview, it scored,
// and the screening board still showed an "Invite" button on their row.
// The result existed the whole time, reachable only from the resume
// detail page. Precedence is the behaviour, so precedence is the test.
import { describe, expect, it } from "vitest";
import { interviewCellState, interviewScoreClass } from "./interviewCellState";
import type { InterviewScorecard } from "@/types";

const scorecard = (over: Partial<InterviewScorecard> = {}) =>
  ({ resume_id: "r1", overall_score: 25.5, is_partial: false, ...over }) as InterviewScorecard;

const base = {
  voiceDone: true,
  scorecard: undefined,
  link: null,
  emailed: false,
  canWrite: true,
  rounds: [{ status: "published" }],
};

describe("interviewCellState", () => {
  it("shows the score once the interview is scored", () => {
    const s = interviewCellState({ ...base, scorecard: scorecard() });
    expect(s).toEqual({ kind: "scored", score: 25.5, isPartial: false });
  });

  it("shows the score instead of the invite button", () => {
    // The actual regression. Both were true at once and invite won.
    const s = interviewCellState({ ...base, scorecard: scorecard() });
    expect(s.kind).not.toBe("invite");
  });

  it("shows the score instead of a copy-link from this page session", () => {
    const s = interviewCellState({
      ...base, scorecard: scorecard(), link: "https://x/i/tok", emailed: true,
    });
    expect(s.kind).toBe("scored");
  });

  it("shows the score even for a read-only viewer", () => {
    const s = interviewCellState({ ...base, scorecard: scorecard(), canWrite: false });
    expect(s.kind).toBe("scored");
  });

  it("marks a partial result as partial", () => {
    const s = interviewCellState({ ...base, scorecard: scorecard({ is_partial: true }) });
    expect(s).toMatchObject({ kind: "scored", isPartial: true });
  });

  it("treats a scorecard with no score as not scored yet", () => {
    // The row exists before the scorer fills it in; a blank chip would
    // read as a zero.
    const s = interviewCellState({ ...base, scorecard: scorecard({ overall_score: null }) });
    expect(s.kind).toBe("invite");
  });

  it("offers nothing until the voice screen has finished", () => {
    const s = interviewCellState({ ...base, voiceDone: false, scorecard: scorecard() });
    expect(s.kind).toBe("not-eligible");
  });

  it("falls back to the invite button when there is no result", () => {
    expect(interviewCellState(base)).toEqual({ kind: "invite", disabled: false });
  });

  it("keeps the invite button disabled while rounds are loading", () => {
    expect(interviewCellState({ ...base, rounds: undefined }))
      .toEqual({ kind: "invite", disabled: true });
  });

  it("does not claim 'no round' while the query is still loading", () => {
    expect(interviewCellState({ ...base, rounds: undefined }).kind).not.toBe("no-round");
  });

  it("says so when no round is published", () => {
    expect(interviewCellState({ ...base, rounds: [{ status: "draft" }] }).kind)
      .toBe("no-round");
  });

  it("keeps the copy-link after inviting, before any result", () => {
    const s = interviewCellState({ ...base, link: "https://x/i/tok", emailed: false });
    expect(s).toEqual({ kind: "invited", link: "https://x/i/tok", emailed: false });
  });
});

describe("interviewScoreClass", () => {
  it("bands high, middling and low scores apart", () => {
    expect(interviewScoreClass(80)).toContain("green");
    expect(interviewScoreClass(60)).toContain("yellow");
    expect(interviewScoreClass(25.5)).toContain("red");
  });
});
