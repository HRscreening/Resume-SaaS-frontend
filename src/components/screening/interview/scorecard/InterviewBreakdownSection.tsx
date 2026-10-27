import type { InterviewBreakdownItem } from "@/types";

interface InterviewBreakdownSectionProps {
  items: InterviewBreakdownItem[];
}

/**
 * The rubric-level breakdown behind the headline score. Deliberately does
 * not color-code the per-item `score`: unlike `overall_score` (documented as
 * 0-100), this contract never pins a scale for breakdown items, and
 * guessing one would risk painting a correct answer red because it happened
 * to score out of 10 rather than 100.
 */
export function InterviewBreakdownSection({ items }: InterviewBreakdownSectionProps) {
  if (items.length === 0) {
    return <p className="text-xs text-[#737373]">No rubric breakdown was reported for this interview.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const label = item.question || item.criterion || item.category || `Item ${i + 1}`;
        return (
          <div key={i} className="rounded-lg border border-[#E8E5DF] bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {item.category && (item.question || item.criterion) && (
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                    {item.category}
                  </p>
                )}
                <p className="text-xs font-medium text-[#0F0F0F]">{label}</p>
              </div>
              {item.score != null && (
                <span className="shrink-0 text-xs font-semibold tabular-nums text-[#0F0F0F]">
                  {item.score}
                </span>
              )}
            </div>
            {item.explanation && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#404040]">{item.explanation}</p>
            )}
            {item.evidence && item.evidence.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {item.evidence.map((quote, qi) => (
                  <blockquote
                    key={qi}
                    className="border-l-2 border-[#C85A17] pl-2.5 text-[11px] italic leading-relaxed text-[#404040]"
                  >
                    &ldquo;{quote}&rdquo;
                  </blockquote>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
