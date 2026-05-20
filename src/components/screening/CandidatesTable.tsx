import { useMemo, useState } from "react";
import type { RankedCandidate, RubricCategory, HiringStage, StagesMap } from "@/types";
import { getTier } from "@/lib/tier";
import AnalysisSheet, { useAnalysisSheetOpen, useAnalysisSheetOpenId, setOpenAnalysisSheet } from "@/components/screening/AnalysisSheet";
import { Pagination } from "@/components/screening/Pagination";
import { FilterDialog } from "@/components/screening/FilterDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StageSelect } from "@/components/screening/StageSelect";
import { sortedStages } from "@/lib/stages";

interface CandidatesTableProps {
  candidates: RankedCandidate[];
  categories: RubricCategory[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  // Skeleton state for page transitions — when true, tbody shows
  // pageSize skeleton rows instead of the (stale) previous page's data.
  loading?: boolean;
  // Hover-prefetch hook for pagination buttons.
  onPrefetchPage?: (page: number) => void;
  // Selection mode (rescore picker). When `selectable` is true, a checkbox
  // column is prepended and rows toggle into `selectedIds` instead of opening
  // the analysis sheet. Selection lives on the parent so it survives page
  // changes, search, and filter.
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggle?: (id: string, e: React.MouseEvent | React.ChangeEvent) => void;
  onTogglePage?: (ids: string[], select: boolean) => void;
  // Stage configuration for the screening and per-candidate updates.
  stages: StagesMap;
  onCandidateStageChange: (resumeId: string, scoreId: string, next: HiringStage) => void;
  onManageStages: () => void;
}

export function CandidatesTable({
  candidates,
  categories,
  page,
  pageSize,
  total,
  onPageChange,
  loading = false,
  onPrefetchPage,
  selectable = false,
  selectedIds,
  onToggle,
  onTogglePage,
  stages,
  onCandidateStageChange,
  onManageStages,
}: CandidatesTableProps) {
  const compact = useAnalysisSheetOpen();
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  // Default landing stage for a candidate that has no stage yet — the first
  // stage in the configured order (e.g. "Applied"). Falls back to "Applied"
  // string when the stages map is empty so the chip still renders.
  const defaultStage = sortedStages(stages)[0]?.name ?? "Applied";

  // Client-side search across the current page. The new backend endpoint is
  // paginated server-side, so this filters only what's already loaded — fine
  // for a recruiter scrubbing a visible page; a future commit can lift this
  // into the query string when the backend grows a search param.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) => {
      const haystack = [
        c.candidate_name,
        c.candidate_email,
        c.candidate_current_job,
        c.filename,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [candidates, search]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Header checkbox tri-state — reflects the current page's visible rows.
  const visibleIds = filtered.map((c) => c.resume_id);
  const visibleSelectedCount = selectable && selectedIds
    ? visibleIds.filter((id) => selectedIds.has(id)).length
    : 0;
  const allVisibleSelected = visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            stroke="#A0A0A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          >
            <circle cx="6" cy="6" r="4.5" /><path d="M9.5 9.5L12 12" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates"
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#E8E5DF] bg-white text-sm text-[#0F0F0F] placeholder:text-[#A0A0A0] focus:outline-none focus:border-[#A0A0A0]"
          />
        </div>
        <button
          onClick={() => setFilterOpen((v) => !v)}
          className={`h-9 px-4 border text-sm font-medium rounded-xl transition-colors flex items-center gap-2 ${
            filterOpen
              ? "border-[#0F0F0F] bg-[#0F0F0F] text-white"
              : "border-[#D4D4D4] text-[#404040] bg-white hover:bg-[#F5F3EE]"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h10M3.5 7h7M5 11h4" />
          </svg>
          Filter
        </button>
      </div>

      {/* Table.
          Width strategy: use `table-fixed` with percentage-style flexible
          columns so the table always fills the container, no matter how many
          rubric categories there are. Candidate column is sticky-left so the
          name stays visible if the user does end up scrolling horizontally
          on a narrow viewport. Rank lives as a tiny badge on the avatar
          instead of its own column. */}
      <div className="rounded-2xl border border-[#E8E5DF] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              {selectable && <col className="w-10" />}
              <col className={compact ? "w-44" : "w-44 sm:w-48"} />
              {!compact && <col className="w-28" />}
              <col className="w-17.5" />
              {!compact && categories.map((cat) => (
                <col key={cat.name} className="w-22.5" />
              ))}
              <col className="w-28" />
              <col className="w-24" />
              {!compact && <col className="w-11" />}
            </colgroup>
            <thead>
              <tr className="border-b border-[#E8E5DF] bg-[#F5F3EE]">
                {selectable && (
                  <th className="px-3 py-2.5 bg-[#F5F3EE]">
                    <input
                      type="checkbox"
                      aria-label={allVisibleSelected ? "Deselect all on this page" : "Select all on this page"}
                      checked={allVisibleSelected}
                      ref={(el) => { if (el) el.indeterminate = someVisibleSelected; }}
                      onChange={() => onTogglePage?.(visibleIds, !allVisibleSelected)}
                      className="h-4 w-4 cursor-pointer accent-[#C85A17]"
                    />
                  </th>
                )}
                <th className="pl-3 pr-2 py-2.5 text-left text-[11px] font-semibold text-[#737373] uppercase tracking-wide sticky left-0 z-10 bg-[#F5F3EE]">Candidate</th>
                {!compact && (
                  <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-[#737373] uppercase tracking-wide">Role</th>
                )}
                <th className="px-2 py-2.5 text-center text-[11px] font-semibold text-[#737373] uppercase tracking-wide">
                  <span className="block">Score</span>
                  <span className="block font-normal text-[10px] text-[#BDB8AE] normal-case tracking-normal">/ 100</span>
                </th>
                {!compact && categories.map((cat) => (
                  <th
                    key={cat.name}
                    className="px-2 py-2.5 text-center text-[11px] font-semibold text-[#737373] uppercase tracking-wide"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {/* Wrap in a span so the trigger is a real element with
                            cursor-help — the full category name + weight + scale
                            renders in the tooltip, while the header itself stays
                            truncated to fit the column. */}
                        <span className="block truncate cursor-help">{cat.name}</span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs font-medium">{cat.name}</p>
                        <p className="text-[10px] opacity-80">Weight {cat.weight}% · scored out of 10</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="block font-normal text-[10px] text-[#BDB8AE] normal-case tracking-normal">/ 10 · {cat.weight}%</span>
                  </th>
                ))}
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-[#737373] uppercase tracking-wide">Stage</th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-[#737373] uppercase tracking-wide">Match</th>
                {!compact && <th className="px-2 py-2.5"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5DF]">
              {loading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <SkeletonRow
                    key={`sk-${i}`}
                    categories={categories}
                    compact={compact}
                    selectable={selectable}
                  />
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={3 + (compact ? 0 : categories.length + 3) + (selectable ? 1 : 0)} className="px-5 py-10 text-center text-sm text-[#737373]">
                    No candidates match “{search}”.
                  </td>
                </tr>
              ) : filtered.map((c) => (
                <CandidateRow
                  key={c.resume_id}
                  candidate={c}
                  categories={categories}
                  compact={compact}
                  stage={c.stage ?? defaultStage}
                  stages={stages}
                  onStageChange={(s) => onCandidateStageChange(c.resume_id, c.score_id, s)}
                  onManageStages={onManageStages}
                  selectable={selectable}
                  selected={selectable ? !!selectedIds?.has(c.resume_id) : false}
                  onToggle={onToggle}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination — full-width row so "Showing X–Y of N" sits left and
          the page buttons sit right (justify-between is on Pagination itself). */}
      {totalPages > 1 && (
        <div className="pt-2">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onChange={onPageChange}
            onPrefetchPage={onPrefetchPage}
          />
        </div>
      )}

      <FilterDialog open={filterOpen} onClose={() => setFilterOpen(false)} />
    </div>
  );
}

function CandidateRow({
  candidate, categories, compact, stage, stages, onStageChange, onManageStages,
  selectable, selected, onToggle,
}: {
  candidate: RankedCandidate;
  categories: RubricCategory[];
  compact: boolean;
  stage: HiringStage;
  stages: StagesMap;
  onStageChange: (s: HiringStage) => void;
  onManageStages: () => void;
  selectable: boolean;
  selected: boolean;
  onToggle?: (id: string, e: React.MouseEvent | React.ChangeEvent) => void;
}) {
  const openId = useAnalysisSheetOpenId();
  const isOpen = openId === candidate.resume_id;
  const tier = getTier(candidate.overall_score);

  // Match category by case-insensitive name. Backend's category labels mirror
  // the rubric, but we normalise here so a casing drift doesn't blank the cell.
  function getCategoryScore(catName: string): number | null {
    const key = catName.toLowerCase().trim();
    const match = candidate.category_scores.find(
      (cs) => cs.category.toLowerCase().trim() === key,
    );
    return match ? match.avg_score : null;
  }

  // Sticky-left cells need an explicit background so the scrolled-under
  // content doesn't bleed through. That background paints over the <tr>'s
  // hover color, which is why the Candidate cell looked dead on hover.
  // Use `group` on the row + `group-hover` on the sticky cell so they stay
  // in sync with the rest of the row.
  const stickyBg = selected
    ? "bg-[#FBF1E7] group-hover:bg-[#F8E9D9]"
    : isOpen
    ? "bg-[#FBF1E7]"
    : "bg-white group-hover:bg-[#FAFAF8]";
  const rowBg = selected
    ? "bg-[#FBF1E7] hover:bg-[#F8E9D9]"
    : isOpen
    ? "bg-[#FBF1E7]"
    : "hover:bg-[#FAFAF8]";

  function handleRowClick(e: React.MouseEvent) {
    if (selectable) {
      onToggle?.(candidate.resume_id, e);
    } else {
      setOpenAnalysisSheet(isOpen ? null : candidate.resume_id);
    }
  }
  return (
    <tr
      onClick={handleRowClick}
      className={`group cursor-pointer transition-colors ${rowBg} ${selected ? "shadow-[inset_2px_0_0_0_#C85A17]" : ""}`}
    >
      {selectable && (
        <td className={`px-3 py-3 align-middle ${stickyBg}`} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            aria-label={`Select ${candidate.candidate_name ?? candidate.filename}`}
            checked={selected}
            onChange={(e) => onToggle?.(candidate.resume_id, e)}
            onClick={(e) => {
              // Forward shift/ctrl modifiers to the toggle handler via the click event.
              if ((e as React.MouseEvent).shiftKey || (e as React.MouseEvent).ctrlKey || (e as React.MouseEvent).metaKey) {
                e.preventDefault();
                onToggle?.(candidate.resume_id, e as React.MouseEvent);
              }
            }}
            className="h-4 w-4 cursor-pointer accent-[#C85A17]"
          />
        </td>
      )}
      {/* Candidate cell — sticky to the left so name stays visible during any
          horizontal scroll. Rank now lives inside the avatar circle instead
          of as a separate badge over name initials. */}
      <td className={`pl-3 pr-2 py-3 align-middle sticky left-0 z-1 transition-colors ${stickyBg}`}>
        <div className="flex gap-2 items-center min-w-0">
          <div className="h-8 w-8 rounded-full bg-[#FBF1E7] flex items-center justify-center shrink-0" title={`Rank ${candidate.rank}`}>
            <span className="text-[12px] font-bold text-[#C85A17] leading-none">
              {candidate.rank}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#0F0F0F] truncate">
              {candidate.candidate_name ?? candidate.filename}
            </p>
            {(candidate.candidate_email || candidate.candidate_phone) && (
              <p className="text-[11px] text-[#737373] truncate">
                {candidate.candidate_email ?? candidate.candidate_phone}
              </p>
            )}
          </div>
        </div>
      </td>
      {!compact && (
        <td className="px-2 py-3 align-middle">
          <p className="text-xs text-[#404040] truncate" title={candidate.candidate_current_job ?? undefined}>
            {candidate.candidate_current_job ?? <span className="text-[#D4D4D4]">—</span>}
          </p>
        </td>
      )}
      <td className="px-2 py-3 text-center align-middle">
        <div className="flex flex-col items-center gap-1">
          <span className="text-base font-bold text-[#0F0F0F] leading-none">
            {Math.round(candidate.overall_score)}
          </span>
          <div className="w-10 h-1 bg-[#E8E5DF] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#C85A17]" style={{ width: `${candidate.overall_score}%` }} />
          </div>
        </div>
      </td>
      {!compact && categories.map((cat) => {
        const score = getCategoryScore(cat.name);
        return (
          <td key={cat.name} className="px-2 py-3 text-center align-middle">
            {score !== null ? (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-[#0F0F0F]">{score.toFixed(1)}</span>
                <div className="w-10 h-1 bg-[#E8E5DF] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#C85A17]" style={{ width: `${score * 10}%` }} />
                </div>
              </div>
            ) : (
              <span className="text-xs text-[#D4D4D4]">--</span>
            )}
          </td>
        );
      })}
      <td className="px-2 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
        <StageSelect value={stage} stages={stages} onChange={onStageChange} onManage={onManageStages} />
      </td>
      <td className="px-2 py-3 align-middle">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F0F0F] whitespace-nowrap"
          title={tier.label}
        >
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tier.dot }} />
          <span className="truncate">{tier.label}</span>
        </span>
      </td>
      {!compact && (
        <td className="px-2 py-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
          <AnalysisSheet resume_id={candidate.resume_id} />
        </td>
      )}
      {compact && isOpen && (
        <td className="hidden" onClick={(e) => e.stopPropagation()}>
          <AnalysisSheet resume_id={candidate.resume_id} />
        </td>
      )}
    </tr>
  );
}

function SkeletonRow({
  categories, compact, selectable,
}: {
  categories: RubricCategory[];
  compact: boolean;
  selectable: boolean;
}) {
  return (
    <tr className="animate-pulse">
      {selectable && (
        <td className="px-3 py-3 align-middle bg-white">
          <div className="h-4 w-4 rounded bg-[#E8E5DF]" />
        </td>
      )}
      <td className="pl-3 pr-2 py-3 align-middle sticky left-0 z-1 bg-white">
        <div className="flex gap-2 items-center">
          <div className="h-8 w-8 rounded-full bg-[#E8E5DF] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 rounded bg-[#E8E5DF]" />
            <div className="h-2.5 w-24 rounded bg-[#F0EDE8]" />
          </div>
        </div>
      </td>
      {!compact && (
        <td className="px-2 py-3 align-middle">
          <div className="h-3 w-20 rounded bg-[#E8E5DF]" />
        </td>
      )}
      <td className="px-2 py-3 align-middle">
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-3.5 w-6 rounded bg-[#E8E5DF]" />
          <div className="h-1 w-10 rounded-full bg-[#F0EDE8]" />
        </div>
      </td>
      {!compact && categories.map((cat) => (
        <td key={cat.name} className="px-2 py-3 align-middle">
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-3 w-6 rounded bg-[#E8E5DF]" />
            <div className="h-1 w-10 rounded-full bg-[#F0EDE8]" />
          </div>
        </td>
      ))}
      <td className="px-2 py-3 align-middle">
        <div className="h-7 w-20 rounded-full bg-[#F0EDE8]" />
      </td>
      <td className="px-2 py-3 align-middle">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-[#E8E5DF]" />
          <div className="h-3 w-12 rounded bg-[#E8E5DF]" />
        </div>
      </td>
      {!compact && (
        <td className="px-2 py-3 align-middle">
          <div className="h-5 w-5 rounded bg-[#F0EDE8] mx-auto" />
        </td>
      )}
    </tr>
  );
}

