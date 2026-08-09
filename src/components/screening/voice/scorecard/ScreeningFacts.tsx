import { TONE_HEX, buildFactRows } from "./scorecardUtils";
import type { Qualification } from "@/types";

import CatgoryScoreCard from "@/components/screening/voice/scorecard/CategoryScores";
import type { CallScorecardDetail } from "@/types";


/**
 * The logistics grid: pay, notice, location, relocation. These knock a candidate
 * out more often than the competency score does, so they sit above the
 * assessment and anything blocking is marked rather than left to be spotted.
 */
export function ScreeningFacts({ qualification,data }: { qualification: Qualification,data:CallScorecardDetail }) {
  const rows = buildFactRows(qualification);
  const captured = rows.filter((r) => r.value).length;

  return (
    <section className="rounded-xl border border-[#E8E5DF] bg-white p-3.5">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-[#737373]">
          Screening facts
        </h4>
        <span className="text-[10px] tabular-nums text-[#A3A3A3]">
          {captured} of {rows.length} captured
        </span>
      </div>

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

      <dl className="mt-2 grid grid-cols-1 gap-px overflow-hidden rounded-lg bg-[#E8E5DF] sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-0.5 bg-[#F5F3EE] px-2.5 py-2"
          >
            <dt className="text-[10px] uppercase tracking-wide text-[#737373]">{row.label}</dt>
            <dd className="flex flex-wrap items-baseline gap-1.5">
              {row.value ? (
                <>
                  <span className="text-sm font-semibold text-[#0F0F0F]">{row.value}</span>
                  {row.note && (
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: TONE_HEX[row.noteTone ?? "neutral"] }}
                    >
                      {row.note}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs italic text-[#A3A3A3]">Not captured on the call</span>
              )}
            </dd>
            {row.blocking && (
              <span className="mt-0.5 inline-flex w-fit items-center gap-1 rounded bg-red-50 px-1.5 py-px text-[10px] font-medium text-red-700">
                <span className="h-1 w-1 rounded-full bg-red-500" />
                Blocking
              </span>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}
