import { useQuery } from "@tanstack/react-query";
import { listInterviewScorecards } from "@/lib/interviewScorecardApi";
import { CollapsibleSection } from "@/components/screening/voice/scorecard/CollapsibleSection";
import { InterviewScorecardHeader } from "./scorecard/InterviewScorecardHeader";
import { InterviewAssessmentSection } from "./scorecard/InterviewAssessmentSection";
import { InterviewBreakdownSection } from "./scorecard/InterviewBreakdownSection";
import { InterviewQuestionDetail } from "./scorecard/InterviewQuestionDetail";

interface InterviewScorecardDrawerProps {
  screeningId: string;
  resumeId: string;
  onClose: () => void;
}

/**
 * The interview round's result, read-only, opened the same way the voice
 * round's CallScorecardDrawer is opened (see InterviewScorePill): a pill
 * beside the resume score that slides this panel in. Deliberately the same
 * drawer shape and section order as the voice scorecard so a recruiter who
 * already knows that surface does not have to learn a second one for the
 * same job.
 */
export function InterviewScorecardDrawer({ screeningId, resumeId, onClose }: InterviewScorecardDrawerProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["interview-scorecards", screeningId],
    queryFn: () => listInterviewScorecards(screeningId),
  });

  const scorecard = data?.scorecards.find((s) => s.resume_id === resumeId);

  // A screening belonging to another account 404s here exactly like every
  // other screening-scoped endpoint (ApiError carries that status), and a
  // network failure is just as unrecoverable from this view. Neither has a
  // candidate-specific message worth showing: both read as "could not load".
  const loadFailed = error != null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-[#E8E5DF] px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#0F0F0F]">Interview Scorecard</h2>
          <button onClick={onClose} aria-label="Close" className="text-[#737373] hover:text-[#0F0F0F] text-lg">
            &times;
          </button>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm text-[#737373]">Loading…</div>
        ) : loadFailed ? (
          <div className="p-6 text-sm text-[#737373]">Could not load the interview results.</div>
        ) : !scorecard ? (
          <div className="p-6 text-sm text-[#737373]">
            This candidate has not completed the interview round yet.
          </div>
        ) : (
          <div className="p-6 space-y-2.5">
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
        )}
      </div>
    </div>
  );
}
