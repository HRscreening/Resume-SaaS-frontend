import type { InterviewScorecard } from "@/types";
import { TONE_CHIP, TONE_HEX, humanizeFlag } from "@/components/screening/voice/scorecard/scorecardUtils";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#E8E5DF] bg-white p-3.5">
      <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#737373]">{title}</h4>
      {children}
    </section>
  );
}

function PointList({ items, color }: { items: readonly string[]; color: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-[#404040]">
          <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

interface InterviewAssessmentSectionProps {
  scorecard: InterviewScorecard;
}

/**
 * Summary, strengths, gaps and flags: the narrative half of the scorecard,
 * next to the number. Each piece drops out independently when the scorer
 * did not report it, same as the voice scorecard's AssessmentSection.
 */
export function InterviewAssessmentSection({ scorecard }: InterviewAssessmentSectionProps) {
  const strengths = scorecard.strengths ?? [];
  const gaps = scorecard.missing_elements ?? [];
  const flags = scorecard.flags ?? [];

  return (
    <>
      {flags.length > 0 && (
        <div className={`flex flex-wrap gap-1 rounded-lg px-1 py-2 ${TONE_CHIP.caution}`}>
          {flags.map((flag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              {humanizeFlag(flag)}
            </span>
          ))}
        </div>
      )}

      {scorecard.overall_summary && (
        <SectionCard title="Summary">
          <p className="text-xs leading-relaxed text-[#404040]">{scorecard.overall_summary}</p>
        </SectionCard>
      )}

      {(strengths.length > 0 || gaps.length > 0) && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {strengths.length > 0 && (
            <SectionCard title="Strengths">
              <PointList items={strengths} color={TONE_HEX.positive} />
            </SectionCard>
          )}
          {gaps.length > 0 && (
            <SectionCard title="Gaps">
              <PointList items={gaps} color={TONE_HEX.critical} />
            </SectionCard>
          )}
        </div>
      )}
    </>
  );
}
