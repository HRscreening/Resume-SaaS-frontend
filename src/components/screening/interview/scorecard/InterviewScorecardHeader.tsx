import {
  TONE_CHIP, TONE_HEX, recommendationChip, scoreTone,
} from "@/components/screening/voice/scorecard/scorecardUtils";
import { formatCompletedAt } from "./interviewScorecardUtils";

interface InterviewScorecardHeaderProps {
  candidateName: string | null;
  score: number | null;
  recommendation: string | null;
  isPartial: boolean;
  completedAt: string | null;
}

/**
 * The decision line for the interview round, read first. `isPartial` sits
 * directly beside the recommendation chip rather than in a footnote: a
 * scorecard built from an interview that ended early is not comparable to a
 * complete one, and a recruiter who missed that distinction would be
 * comparing two different things without knowing it.
 */
export function InterviewScorecardHeader({
  candidateName, score, recommendation, isPartial, completedAt,
}: InterviewScorecardHeaderProps) {
  const rec = recommendationChip(recommendation);
  const tone = scoreTone(score);
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const completed = formatCompletedAt(completedAt);

  return (
    <div className="rounded-xl border border-[#E8E5DF] bg-white p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#0F0F0F]">{candidateName ?? "Candidate"}</p>
        {completed && <span className="text-[11px] text-[#A3A3A3]">Completed {completed}</span>}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${TONE_CHIP[rec.tone]}`}
        >
          {rec.label}
        </span>
        {isPartial && (
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${TONE_CHIP.caution}`}
            title="This interview ended before all questions were covered. Scored on the evidence collected so far, not the full round."
          >
            Partial interview
          </span>
        )}
      </div>

      {score != null && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#737373]">
              Interview score
            </span>
            <span className="text-lg font-bold tabular-nums" style={{ color: TONE_HEX[tone] }}>
              {score.toFixed(0)}
              <span className="text-[11px] font-normal text-[#A3A3A3]">/100</span>
            </span>
          </div>
          <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#EAE7DF]">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${pct}%`, backgroundColor: TONE_HEX[tone] }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
