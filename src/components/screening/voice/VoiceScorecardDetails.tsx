import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCallScorecard } from "@/lib/api";
import type { CallScorecardDetail } from "@/types";
import { ScorecardHeader } from "./scorecard/ScorecardHeader";
import { ScreeningFacts } from "./scorecard/ScreeningFacts";
import { AssessmentSection,SectionCard } from "./scorecard/AssessmentSection";
import { CriterionBreakdown, isBreakdownItem } from "./scorecard/CriterionBreakdown";
import { TranscriptPanel } from "./scorecard/TranscriptPanel";
import { CollapsibleSection } from "./scorecard/CollapsibleSection";
import {
  TONE_CHIP, formatDuration, hasAssessment, humanizeFlag, mergeFlags,
} from "./scorecard/scorecardUtils";

interface VoiceScorecardDetailsProps {
  screeningId: string;
  callId: string;
  /** Call duration, when the caller already has it — avoids a second fetch. */
  durationSeconds?: number | null;
}

/**
 * Everything a recruiter needs to decide what happens to this candidate next,
 * in the order they decide it: verdict and score, then the logistics that knock
 * people out, then the evidence behind the score, then the raw call.
 *
 * A discovery call produces BOTH a qualification card (pay, notice, location)
 * and a competency assessment (score, strengths, per-criterion evidence). These
 * used to be mutually exclusive branches, so any call with a qualification card
 * rendered a headline score with nothing whatsoever to justify it. Both render
 * now; each section is independently optional and simply drops out when the
 * data behind it is absent.
 */
export function VoiceScorecardDetails({
  screeningId, callId, durationSeconds,
}: VoiceScorecardDetailsProps) {
  const { data, isLoading, isError } = useQuery<CallScorecardDetail>({
    queryKey: ["call-scorecard", screeningId, callId],
    queryFn: () => getCallScorecard(screeningId, callId),
    staleTime: 60_000,
  });

  const breakdown = useMemo(
    () => (data?.breakdown ?? []).filter(isBreakdownItem),
    [data],
  );

  if (isLoading) return <p className="text-xs text-[#737373]">Loading interview results…</p>;
  if (isError || !data) {
    return <p className="text-xs text-[#737373]">Could not load the interview results.</p>;
  }

  const q = data.qualification;
  // Qualification flags are logistics ("Long notice period"); scorer flags are
  // interview observations. They overlap, so merge and dedupe rather than
  // showing the recruiter the same warning twice in two different chips.
  const flags = mergeFlags(q?.flags, data.flags);

  return (
    <div className="space-y-2.5">
      <ScorecardHeader
        score={data.overall_score}
        recommendation={data.recommendation}
        verdict={q?.verdict}
        verdictReason={q?.verdict_reason || null}
        isPartial={data.is_partial}
        duration={formatDuration(durationSeconds)}
      />

      {flags.length > 0 && (
        <div className={`flex flex-wrap gap-1 py-2 ${TONE_CHIP.caution}`}>
          {flags.map((flag, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium `}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              {humanizeFlag(flag)}
            </span>
          ))}
        </div>
      )}

      {data.overall_summary && (
        <SectionCard title="Summary">
          <p className="text-xs leading-relaxed text-[#404040]">{data.overall_summary}</p>
        </SectionCard>
      )}

      {q && <ScreeningFacts qualification={q} data={data} />}

      {q?.reschedule_requested && (
        <p className="rounded-lg border border-[#E8E5DF] bg-[#F5F3EE] px-3 py-2 text-[11px] text-[#404040]">
          Asked to be called back: <span className="font-semibold">{q.reschedule_requested}</span>
        </p>
      )}

      {hasAssessment(data) && (
        <CollapsibleSection title="Interview assessment">
          <div className="space-y-2.5 pt-1">
            <AssessmentSection data={data} />
          </div>
        </CollapsibleSection>
      )}

      {q?.interest_summary && (
        <CollapsibleSection title="Interest and motivation">
          <p className="pt-1 text-xs leading-relaxed text-[#404040]">{q.interest_summary}</p>
        </CollapsibleSection>
      )}


  

      {q && q.role_read.length > 0 && (
        <CollapsibleSection title="How they answered the role questions" count={q.role_read.length}>
          <ul className="space-y-1.5 pt-1">
            {q.role_read.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-[#404040]">
                <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#C85A17]" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      <div className="w-full flex flex-col items-start gap-x-4 gap-y-1.5 pt-0.5">
        <CriterionBreakdown items={breakdown} />
        {/* <TranscriptPanel turns={data.transcript} /> */}
      </div>
    </div>
  );
}
