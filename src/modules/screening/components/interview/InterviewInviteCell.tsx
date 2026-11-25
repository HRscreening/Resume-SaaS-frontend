import type { RankedCandidate } from "@/modules/screening/types/screening.type";
import { useInterviewInvite, useInterviewRound } from "@/modules/screening/hooks/interview/useInterviewRound";
import { interviewCellState } from "./interviewCellState";
import { InterviewRoundAction } from "./InterviewRoundAction";

interface InterviewInviteCellProps {
  candidate: RankedCandidate;
  screeningId: string;
  canWrite: boolean;
}

// The interview round, in the candidate's row beside their screening result.
// Everything shown here comes from the server's per-candidate status, the same
// source the First Round tab uses, so the two always agree.
export function InterviewInviteCell({ candidate, screeningId, canWrite }: InterviewInviteCellProps) {
  const round = useInterviewRound(screeningId, candidate.resume_id);
  const invite = useInterviewInvite(screeningId, candidate.resume_id, candidate.candidate_name);
  const view = interviewCellState({ ...round, canWrite });
  return (
    <InterviewRoundAction
      view={view}
      screeningId={screeningId}
      variant="compact"
      onInvite={() => invite.mutate()}
      inviting={invite.isPending}
    />
  );
}
