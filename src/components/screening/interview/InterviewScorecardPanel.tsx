import { useQuery } from "@tanstack/react-query";
import { listInterviewScorecards } from "@/lib/interviewScorecardApi";
import { CollapsibleSection } from "@/components/screening/voice/scorecard/CollapsibleSection";
import { InterviewScorecardHeader } from "./scorecard/InterviewScorecardHeader";
import { InterviewAssessmentSection } from "./scorecard/InterviewAssessmentSection";
import { InterviewBreakdownSection } from "./scorecard/InterviewBreakdownSection";
import { InterviewQuestionDetail } from "./scorecard/InterviewQuestionDetail";

interface InterviewScorecardPanelProps {
  screeningId: string;
  resumeId: string;
}

/**
 * The interview round's result as CONTENT, with no chrome of its own, so
 * the same body can sit in a modal drawer (InterviewScorecardDrawer) or as
 * a tab inside the candidate sheet. It was originally written only as a
 * drawer, which is why a recruiter looking at the candidate sheet saw the
 * voice round's result and no sign the interview round had ever run.
 *
 * Section order deliberately matches the voice scorecard: a recruiter who
 * knows that surface should not have to learn a second one for the same job.
 *
 * Shares the ["interview-scorecards", screeningId] cache key with the row
 * badge and the pill, so opening this costs nothing on a board that has
 * already loaded.
 */
export function InterviewScorecardPanel({ screeningId, resumeId }: InterviewScorecardPanelProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["interview-scorecards", screeningId],
    queryFn: () => listInterviewScorecards(screeningId),
  });

  const scorecard = data?.scorecards.find((s) => s.resume_id === resumeId);

  // A screening belonging to another account 404s here exactly like every
  // other screening-scoped endpoint (ApiError carries that status), and a
  // network failure is just as unrecoverable from this view. Neither has a
  // candidate-specific message worth showing: both read as "could not load".
  if (isLoading) {
    return <div className="py-10 text-center text-sm text-[#737373]">Loading…</div>;
  }
  if (error != null) {
    return (
      <div className="py-10 text-center text-sm text-[#737373]">
        Could not load the interview results.
      </div>
    );
  }
  if (!scorecard) {
    return (
      <div className="py-10 text-center text-sm text-[#737373]">
        This candidate has not completed the interview round yet.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <InterviewScorecardHeader
        candidateName={scorecard.candidate_name}
        score={scorecard.overall_score}
        recommendation={scorecard.recommendation}
        isPartial={scorecard.is_partial}
        completedAt={scorecard.completed_at}
      />

      <InterviewAssessmentSection scorecard={scorecard} />

      <CollapsibleSection title="Score breakdown" defaultOpen count={scorecard.breakdown.length}>
        <div className="pt-1">
          <InterviewBreakdownSection items={scorecard.breakdown} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Per-question detail"
        defaultOpen
        count={Object.keys(scorecard.per_question ?? {}).length}
      >
        <div className="pt-1">
          <InterviewQuestionDetail scorecard={scorecard} />
        </div>
      </CollapsibleSection>
    </div>
  );
}
