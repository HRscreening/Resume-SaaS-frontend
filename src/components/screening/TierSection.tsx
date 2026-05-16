import { useState } from "react";
import type { RankedCandidate, RubricCategory } from "@/types";
import AnalysisSheet, { useAnalysisSheetOpen, setOpenAnalysisSheet } from "@/components/screening/AnalysisSheet";

// Module-level so we don't reconstruct it on every CandidateRow render.
const LIST_FORMATTER = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

export const TIERS = [
  { id: "strong",    label: "Strong Match", min: 75, dot: "#22C55E" },
  { id: "potential", label: "Potential",    min: 55, dot: "#EAB308" },
  { id: "risky",     label: "Risky",        min: 35, dot: "#F97316" },
  { id: "poor",      label: "Poor Fit",     min: 0,  dot: "#EF4444" },
];

export type TierId = "strong" | "potential" | "risky" | "poor";

export function getTier(score: number) {
  if (score >= 75) return TIERS[0];
  if (score >= 55) return TIERS[1];
  if (score >= 35) return TIERS[2];
  return TIERS[3];
}

interface TierSectionProps {
  tier: typeof TIERS[number];
  candidates: RankedCandidate[];
  collapsed: boolean;
  onToggle: () => void;
  categories: RubricCategory[];
  onSelect: (c: RankedCandidate) => void;
  /**
   * Fired when the user hovers/focuses a candidate row. The parent uses this
   * to prefetch the resume-detail and resume-pdf queries so navigating to the
   * candidate page is warm-cache fast. Optional — if omitted, no prefetching.
   */
  onPrefetch?: (c: RankedCandidate) => void;
}

export function TierSection({ tier, candidates, collapsed, onToggle, categories, onPrefetch }: TierSectionProps) {
  // When the AnalysisSheet is open, the table collapses to a narrow form so the
  // sheet has room — current job + per-criterion columns get hidden.
  const compact = useAnalysisSheetOpen();
  return (
    <div className="rounded-2xl border border-[#E8E5DF] bg-white overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-3 bg-[#F5F3EE] hover:bg-[#EFEAE0] transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tier.dot }} />
          <span className="text-sm font-semibold text-[#0F0F0F]">{tier.label}</span>
          <span className="text-xs text-[#737373]">· {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          className={`text-[#A0A0A0] transition-transform ${collapsed ? "" : "rotate-180"}`}><path d="M3 5l4 4 4-4" /></svg>
      </button>

      {!collapsed && (
        <div className="border-t border-[#E8E5DF] overflow-x-auto">
          <table className="w-full text-sm">
            <colgroup>
              <col style={{ minWidth: "240px" }} />
              {!compact && <col style={{ width: "140px" }} />}
              <col style={{ width: "90px" }} />
              {!compact && categories.map((cat) => (
                <col key={cat.name} style={{ width: "150px" }} />
              ))}
              <col style={{ width: "60px" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-[#E8E5DF]">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-[#737373] uppercase tracking-wide">Candidate</th>
                {!compact && (
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#737373] uppercase tracking-wide">Current Role</th>
                )}
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-[#737373] uppercase tracking-wide align-top">
                  <div className="flex flex-col">
                    <span>Score</span>
                    <span className="font-normal text-[10px] text-[#BDB8AE] normal-case tracking-normal">(out of 100)</span>
                    <span className="font-normal text-[#A0A0A0] normal-case tracking-normal">&nbsp;</span>
                  </div>
                </th>
                {!compact && categories.map((cat) => (
                  <th key={cat.name} className="px-3 py-2.5 text-center text-xs font-semibold text-[#737373] uppercase tracking-wide align-top">
                    <div className="flex flex-col">
                      <span className="whitespace-nowrap">{cat.name}</span>
                      <span className="font-normal text-[10px] text-[#BDB8AE] normal-case tracking-normal">(out of 10)</span>
                      <span className="font-normal text-[#A0A0A0] normal-case tracking-normal">{cat.weight}%</span>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-[#737373] uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5DF]">
              {candidates.map((c) => (
                <CandidateRow
                  key={c.resume_id}
                  candidate={c}
                  categories={categories}
                  compact={compact}
                  onPrefetch={onPrefetch ? () => onPrefetch(c) : undefined}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CandidateRow({ candidate, categories, compact, onPrefetch }: {
  candidate: RankedCandidate;
  categories: RubricCategory[];
  compact: boolean;
  onPrefetch?: () => void;
}) {
  function getCategoryScore(cat: RubricCategory): number | null {
    const subs = cat.subcategories;
    if (subs.length === 0) return null;
    let weighted = 0, totalW = 0;
    for (const sub of subs) {
      const match = candidate.top_criteria.find(
        (tc) => tc.criterion.toLowerCase().trim() === sub.name.toLowerCase().trim()
      );
      if (match) {
        weighted += match.score * sub.weight;
        totalW += sub.weight;
      }
    }
    return totalW > 0 ? weighted / totalW : null;
  }

  const failedNonNegotiables = categories
    .flatMap((cat) => cat.subcategories)
    .filter((sub) => sub.is_non_negotiable)
    .map((sub) => {
      const match = candidate.top_criteria.find(
        (tc) => tc.criterion.toLowerCase().trim() === sub.name.toLowerCase().trim()
      );
      return match && match.score < 4 ? sub.name : null;
    })
    .filter(Boolean) as string[];

  // "A and B" / "A, B, and C" — reads as a sentence, not a CSV.
  const failedList = LIST_FORMATTER.format(failedNonNegotiables);
  const isDisqualified = failedNonNegotiables.length > 0;
  const [expanded, setExpanded] = useState(false);

  return (
    <tr
      onClick={() => setOpenAnalysisSheet(candidate.resume_id)}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className="cursor-pointer transition-colors hover:bg-[#FAFAF8]"
    >
      {/* Left accent bar — flags the whole row as disqualified when must-haves
          are missing. Always 4px wide so rows align; transparent when clean. */}
      <td
        className={`px-5 py-3.5 border-l-4 ${
          isDisqualified ? "border-[#C85A17]" : "border-transparent"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-[#FBF1E7] flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xs font-semibold text-[#C85A17]">{(candidate.candidate_name ?? candidate.filename).slice(0, 2).toUpperCase()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#0F0F0F] truncate">{candidate.candidate_name ?? candidate.filename}</p>
            {candidate.candidate_email && (
              <p className="text-xs text-[#737373] truncate">{candidate.candidate_email}</p>
            )}
            {candidate.candidate_phone && (
              <p className="text-xs text-[#737373] truncate">{candidate.candidate_phone}</p>
            )}
            {isDisqualified && (
              <p
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((v) => !v);
                }}
                title={expanded ? "Click to collapse" : "Click to expand"}
                className={`text-xs mt-1 cursor-pointer hover:opacity-80 transition-opacity break-words ${expanded ? "" : "line-clamp-2"}`}
              >
                <span className="text-[#737373]">Missing must-haves:</span>{" "}
                <span className="font-medium text-[#C85A17]">{failedList}</span>
              </p>
            )}
          </div>
        </div>
      </td>
      {!compact && (
        <td className="px-3 py-3.5 align-middle">
          <p className="text-xs text-[#404040] line-clamp-2">{candidate.candidate_current_job ?? <span className="text-[#D4D4D4]">—</span>}</p>
        </td>
      )}
      <td className="px-3 py-3.5 text-center align-middle">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-lg font-bold text-[#0F0F0F] leading-none">{Math.round(candidate.overall_score)}</span>
          <div className="w-12 h-1.5 bg-[#E8E5DF] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#C85A17]" style={{ width: `${candidate.overall_score}%` }} />
          </div>
        </div>
      </td>
      {!compact && categories.map((cat) => {
        const catScore = getCategoryScore(cat);
        return (
          <td key={cat.name} className="px-3 py-3.5 text-center align-middle">
            {catScore !== null ? (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-xs font-bold text-[#0F0F0F]">{catScore.toFixed(1)}</span>
                <div className="w-12 h-1.5 bg-[#E8E5DF] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#C85A17]" style={{ width: `${catScore * 10}%` }} />
                </div>
              </div>
            ) : (
              <span className="text-xs text-[#D4D4D4]">--</span>
            )}
          </td>
        );
      })}
      <td
        className="px-3 py-3.5 text-center align-middle"
        onClick={(e) => e.stopPropagation()}
      >
        <AnalysisSheet resume_id={candidate.resume_id} />
      </td>
    </tr>
  );
}
