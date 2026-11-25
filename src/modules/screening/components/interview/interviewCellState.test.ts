// Precedence is the behaviour: a scored interview beats an invite, an open
// invite keeps its link after a reload, and a candidate the screening round
// has not cleared is told why before any setup action is offered.
import { describe, expect, it } from "vitest";
import { interviewCellState, interviewScoreClass } from "./interviewCellState";
import type { InterviewCandidateState, InterviewScorecard } from "@/types";

const scorecard = (over: Partial<InterviewScorecard> = {}) =>
  ({ resume_id: "r1", overall_score: 25.5, is_partial: false, ...over }) as InterviewScorecard;

const candidate = (over: Partial<InterviewCandidateState> = {}): InterviewCandidateState => ({
  resume_id: "r1", eligibility: "eligible", reason: "Ready for the interview round.",
  session_status: null, invite_url: null, ...over,
});

const base = {
  loading: false,
  scorecard: undefined,
  candidate: candidate(),
  roundState: "published" as const,
  roundId: "round-1",
  canWrite: true,
};

describe("interviewCellState", () => {
  it("shows the score once the interview is scored, over everything", () => {
    const s = interviewCellState({ ...base, scorecard: scorecard(), canWrite: false });
    expect(s).toEqual({ kind: "scored", score: 25.5, isPartial: false });
  });

  it("treats a scorecard with no score as not scored yet", () => {
    expect(interviewCellState({ ...base, scorecard: scorecard({ overall_score: null }) }).kind).toBe("invite");
  });

  it("waits while the status is loading", () => {
    expect(interviewCellState({ ...base, loading: true }).kind).toBe("loading");
  });

  it("keeps an open invite's link from the server", () => {
    const s = interviewCellState({ ...base, candidate: candidate({ invite_url: "https://x/i/t", session_status: "invited" }) });
    expect(s).toEqual({ kind: "invited", link: "https://x/i/t", sessionStatus: "invited" });
  });

  it("says why a candidate cannot be invited", () => {
    const s = interviewCellState({
      ...base, candidate: candidate({ eligibility: "no_screen", reason: "The screening round has not happened." }),
    });
    expect(s).toMatchObject({ kind: "not-eligible", label: "Screen first", reason: "The screening round has not happened." });
  });

  it("explains ineligibility before asking for a round", () => {
    const s = interviewCellState({ ...base, roundState: "none", roundId: null, candidate: candidate({ eligibility: "screen_in_progress" }) });
    expect(s.kind).toBe("not-eligible");
  });

  it("asks to set up a round when none exists", () => {
    expect(interviewCellState({ ...base, roundState: "none", roundId: null }).kind).toBe("setup-round");
  });

  it("asks to publish a draft round, with a link to it", () => {
    expect(interviewCellState({ ...base, roundState: "draft", roundId: "d1" })).toEqual({ kind: "publish-round", roundId: "d1" });
  });

  it("offers the invite once eligible and published", () => {
    expect(interviewCellState(base).kind).toBe("invite");
  });

  it("offers nothing to change for a read-only viewer", () => {
    expect(interviewCellState({ ...base, canWrite: false }).kind).toBe("read-only");
  });
});

describe("interviewScoreClass", () => {
  it("bands scores", () => {
    expect(interviewScoreClass(80)).toContain("green");
    expect(interviewScoreClass(60)).toContain("yellow");
    expect(interviewScoreClass(20)).toContain("red");
  });
});
