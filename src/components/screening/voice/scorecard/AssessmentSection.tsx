import type { CallScorecardDetail } from "@/types";
import { TONE_HEX, criterionTone, partitionMissingElements } from "./scorecardUtils";
import CatgoryScoreCard from "@/components/screening/voice/scorecard/categoryScores";


function SectionCard({ title, aside, children }: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#E8E5DF] bg-white p-3.5">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-[#737373]">{title}</h4>
        {aside}
      </div>
      {children}
    </section>
  );
}

function PointList({ items, color }: { items: readonly string[]; color: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-[#404040]">
          <span
            className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Everything that justifies the headline score: the narrative, what the
 * candidate demonstrated, what counted against them, what the call never got
 * to, and how each rubric category pulled the number around.
 */
export function AssessmentSection({ data }: { data: CallScorecardDetail }) {
  const { concerns, notAsked } = partitionMissingElements(data.missing_elements);
  const strengths = data.strengths ?? [];
  const drivers = data.score_drivers;

  return (
    <>
      {data.overall_summary && (
        <SectionCard title="What the interview showed">
          <p className="text-xs leading-relaxed text-[#404040]">{data.overall_summary}</p>
        </SectionCard>
      )}

      {/* Category Scores */}
      {
        data.categrory_scores && data.categrory_scores.length > 0 && (

          <div className="w-full flex flex-row items-start justify-between gap-2">
            {
              data.categrory_scores.map((cat, i) => (
                <CatgoryScoreCard key={i} data={cat} />
              ))
            }
          </div>
        )
      }

      {(strengths.length > 0 || concerns.length > 0) && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {strengths.length > 0 && (
            // <SectionCard title="Demonstrated">
            <SectionCard title="Strengths">
              <PointList items={strengths} color={TONE_HEX.positive} />
            </SectionCard>
          )}
          {concerns.length > 0 && (
            <SectionCard title="Missing">
              {/* <SectionCard title="Counted against"> */}
              <PointList items={concerns} color={TONE_HEX.critical} />
            </SectionCard>
          )}
        </div>
      )}

      {/* Coverage gaps are deliberately NOT filed under concerns: the candidate
          was never asked, so a low score here reflects the call, not them. */}
      {notAsked.length > 0 && (
        <SectionCard
          title="Never asked on this call"
          aside={
            <span className="text-[10px] text-[#A3A3A3]">
              {notAsked.length} topic{notAsked.length === 1 ? "" : "s"} unscored
            </span>
          }
        >
          <p className="mb-2 text-[11px] leading-relaxed text-[#737373]">
            The score below reflects only what was covered. Weigh it accordingly, or re-run the
            call to close these gaps.
          </p>
          <PointList items={notAsked} color="#A3A3A3" />
        </SectionCard>
      )}

      {drivers && drivers.categories.length > 0 && (
        <SectionCard
          title="Score by category"
          aside={<span className="text-[10px] text-[#A3A3A3]">vs {drivers.baseline.toFixed(0)}/10 baseline</span>}
        >
          <div className="space-y-2">
            {drivers.categories.map((cat) => {
              const tone = criterionTone(cat.avg_score);
              return (
                <div key={cat.name}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#0F0F0F]">
                      {cat.name}
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums text-[#A3A3A3]">
                      {cat.weight_pct}% weight
                    </span>
                    <span
                      className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums"
                      style={{ color: TONE_HEX[tone] }}
                    >
                      {cat.avg_score.toFixed(1)}
                      <span className="text-[10px] font-normal text-[#A3A3A3]">/10</span>
                    </span>
                    <span
                      className={`w-11 shrink-0 text-right text-[10px] font-semibold tabular-nums ${cat.direction === "positive" ? "text-green-700"
                          : cat.direction === "negative" ? "text-red-600"
                            : "text-[#A3A3A3]"
                        }`}
                    >
                      {cat.delta_points >= 0 ? "+" : ""}{cat.delta_points.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[#EAE7DF]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(0, Math.min(100, cat.avg_score * 10))}%`,
                        backgroundColor: TONE_HEX[tone],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </>
  );
}
