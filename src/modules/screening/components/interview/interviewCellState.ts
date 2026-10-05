// What the interview column shows for one candidate, as a pure decision.
//
// Extracted from InterviewInviteCell because the ORDER of these cases is
// the whole behaviour, and it was wrong: the cell knew how to invite a
// candidate and nothing about what came back. A finished, scored
// interview still rendered an "Invite" button, so the only place a
// recruiter could see a result was the resume detail page they had no
// reason to open. The result now outranks every invite affordance, which
// is the one rule worth pinning in a test.
import type { InterviewScorecard } from "@/types";

export type InterviewCellState =
  // The voice screen has not finished, so this round is not offered yet.
  | { kind: "not-eligible" }
  // Scored. Terminal, and beats everything below it.
  | { kind: "scored"; score: number; isPartial: boolean }
  // Invited in THIS page session: `link` is local state, so this is lost
  // on reload. That is survivable only because "scored" above is not.
  | { kind: "invited"; link: string; emailed: boolean }
  | { kind: "read-only" }
  | { kind: "no-round" }
  | { kind: "invite"; disabled: boolean };

export interface InterviewCellInput {
  voiceDone: boolean;
  scorecard: InterviewScorecard | undefined;
  link: string | null;
  emailed: boolean;
  canWrite: boolean;
  // undefined while the rounds query is still in flight.
  rounds: { status: string }[] | undefined;
}

export function interviewCellState({
  voiceDone,
  scorecard,
  link,
  emailed,
  canWrite,
  rounds,
}: InterviewCellInput): InterviewCellState {
  if (!voiceDone) return { kind: "not-eligible" };

  // Before the invite affordances on purpose. A scored interview is the
  // end of this flow; showing "Invite" next to a candidate who already
  // sat the round is how a recruiter concludes the round never ran.
  if (scorecard && scorecard.overall_score != null) {
    return {
      kind: "scored",
      score: scorecard.overall_score,
      isPartial: scorecard.is_partial === true,
    };
  }

  if (link) return { kind: "invited", link, emailed };
  if (!canWrite) return { kind: "read-only" };

  // Only once the query has answered: "No round" while still loading
  // would flicker onto every row of a large board.
  if (rounds !== undefined && !rounds.some((r) => r.status === "published")) {
    return { kind: "no-round" };
  }

  return { kind: "invite", disabled: rounds === undefined };
}

// Shared with CandidateVoiceCell's thresholds so the two rounds read the
// same way down a row. Duplicated rather than imported: they are separate
// scorers and either may re-band without dragging the other with it.
export function interviewScoreClass(score: number): string {
  if (score >= 75) return "bg-green-50 border-green-200 text-green-700";
  if (score >= 55) return "bg-yellow-50 border-yellow-200 text-yellow-700";
  return "bg-red-50 border-red-200 text-red-700";
}
