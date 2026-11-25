// What the interview round shows for one candidate, as a pure decision.
//
// One function for the candidate row and the First Round tab, so the two can
// never disagree. The ORDER of these cases is the behaviour:
//   1. A scored interview beats everything: showing "Invite" next to a
//      candidate who already sat the round is how a recruiter concludes it
//      never ran.
//   2. An open invite shows its link, from the server, so it survives a reload.
//   3. A candidate the screening round has not cleared says why.
//   4. Only then does the round's own setup decide: set it up, publish it,
//      or invite.
import type { InterviewCandidateState, InterviewEligibility, InterviewScorecard } from "@/types";

export type InterviewCellState =
  | { kind: "loading" }
  | { kind: "scored"; score: number; isPartial: boolean }
  | { kind: "invited"; link: string; sessionStatus: string | null }
  | { kind: "not-eligible"; eligibility: InterviewEligibility; label: string; reason: string }
  | { kind: "read-only" }
  | { kind: "setup-round" }
  | { kind: "publish-round"; roundId: string }
  | { kind: "invite" };

export interface InterviewCellInput {
  loading: boolean;
  scorecard: InterviewScorecard | undefined;
  candidate: InterviewCandidateState | undefined;
  roundState: "none" | "draft" | "published" | undefined;
  roundId: string | null;
  canWrite: boolean;
}

// Short enough for a table cell; the full reason goes in the tooltip and tab.
export const ELIGIBILITY_LABELS: Record<InterviewEligibility, string> = {
  eligible: "Ready",
  no_screen: "Screen first",
  screen_in_progress: "Screening…",
  screen_not_completed: "Not reached",
  withdrawn: "Withdrew",
  no_score: "No score",
};

export function interviewCellState({
  loading, scorecard, candidate, roundState, roundId, canWrite,
}: InterviewCellInput): InterviewCellState {
  if (scorecard && scorecard.overall_score != null) {
    return { kind: "scored", score: scorecard.overall_score, isPartial: scorecard.is_partial === true };
  }
  if (loading || !candidate || roundState === undefined) return { kind: "loading" };
  if (candidate.invite_url) {
    return { kind: "invited", link: candidate.invite_url, sessionStatus: candidate.session_status };
  }
  if (candidate.eligibility !== "eligible") {
    return {
      kind: "not-eligible",
      eligibility: candidate.eligibility,
      label: ELIGIBILITY_LABELS[candidate.eligibility],
      reason: candidate.reason,
    };
  }
  if (!canWrite) return { kind: "read-only" };
  if (roundState === "none" || !roundId) return { kind: "setup-round" };
  if (roundState === "draft") return { kind: "publish-round", roundId };
  return { kind: "invite" };
}

// Shared with CandidateVoiceCell's thresholds so the two rounds read the
// same way down a row. Duplicated rather than imported: they are separate
// scorers and either may re-band without dragging the other with it.
export function interviewScoreClass(score: number): string {
  if (score >= 75) return "bg-green-50 border-green-200 text-green-700";
  if (score >= 55) return "bg-yellow-50 border-yellow-200 text-yellow-700";
  return "bg-red-50 border-red-200 text-red-700";
}
