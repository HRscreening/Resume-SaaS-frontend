import { useQuery } from "@tanstack/react-query";
import { listInterviewScorecards } from "@/lib/interviewScorecardApi";

interface InterviewScorePillProps {
  screeningId: string;
  resumeId: string;
  onOpen: () => void;
}

function pillStyle(score: number): string {
  if (score >= 75) return "bg-green-50 border-green-200 text-green-700";
  if (score >= 55) return "bg-yellow-50 border-yellow-200 text-yellow-700";
  return "bg-red-50 border-red-200 text-red-700";
}

/**
 * Compact interview-round result beside the resume score, mirroring
 * VoiceScorePill for the voice round. Renders nothing when this candidate
 * has no scored interview session yet — an empty or 404ing scorecard list
 * (round not built, screening mismatch) looks identical to "never sat the
 * round" from here, which is the right default: this is a passive
 * indicator, not where a load failure should be explained.
 */
export function InterviewScorePill({ screeningId, resumeId, onOpen }: InterviewScorePillProps) {
  const { data } = useQuery({
    queryKey: ["interview-scorecards", screeningId],
    queryFn: () => listInterviewScorecards(screeningId),
    staleTime: 30_000,
  });

  const scorecard = data?.scorecards.find((s) => s.resume_id === resumeId);
  if (!scorecard || scorecard.overall_score == null) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      title={`Interview: ${scorecard.overall_score.toFixed(1)} · ${scorecard.recommendation ?? ""}. Click to review.`}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold shrink-0 hover:opacity-80 transition-opacity ${pillStyle(scorecard.overall_score)}`}
    >
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 7a5 5 0 0 1 10 0M4 11h6M7 7v4" />
      </svg>
      {Math.round(scorecard.overall_score)} · Interview{scorecard.is_partial ? " (partial)" : ""}
    </button>
  );
}
