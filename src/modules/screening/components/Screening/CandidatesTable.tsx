import type { HiringStage, MatchTierId, RangeFilter, RubricCategory, SortRule, StagesMap } from "@/types";
import type { CandidateQueryState, RankedCandidate } from "@/modules/screening/types/screening.type";
import { getTier } from "@/lib/tier";
import AnalysisSheet, { useAnalysisSheetOpen, useAnalysisSheetOpenId, setOpenAnalysisSheet } from "@/modules/screening/components/Screening/AnalysisSheet";
import { Pagination } from "@/components/screening/Pagination";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StageSelect } from "@/components/screening/StageSelect";
import { sortedStages } from "@/lib/stages";
import { CandidatesToolbar } from "@/components/screening/filters/CandidatesToolbar";
import { ActiveFilterChips } from "@/components/screening/filters/ActiveFilterChips";
import { SortableHeader } from "@/components/screening/filters/SortableHeader";
import { hasActiveFilters } from "@/components/screening/filters/queryEncoding";
import { useEffect, useMemo, useRef } from "react";
import { useInView } from "react-intersection-observer";


interface CandidatesTableProps {
  candidates: RankedCandidate[];
  categories: RubricCategory[];
  // Skeleton state for page transitions — when true, tbody shows
  // pageSize skeleton rows instead of the (stale) previous page's data.
  loading?: boolean;
  // Hover-prefetch hook for pagination buttons.
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
  // Filter / sort / search state. When provided, the toolbar + chips render
  // and column headers become sortable. Optional so callers in selection
  // ("show selected only") views can still render the table without filters.
  onLoadMore?: () => Promise<unknown>;
  hasMore?: boolean;
  loadingMore?: boolean;
  queryState?: CandidateQueryState;
  searchInput?: string;
  onSearchChange?: (s: string) => void;
  onStageFilterChange?: (next: string[]) => void;
  onMatchFilterChange?: (next: MatchTierId[]) => void;
  onSortChange?: (next: SortRule[]) => void;
  onOverallRangeChange?: (range: RangeFilter | undefined) => void;
  onCategoryRangeChange?: (name: string, range: RangeFilter | undefined) => void;
  onClearAllFilters?: () => void;
}

export function CandidatesTable({
  candidates,
  categories,
  loading = false,
  selectable = false,
  selectedIds,
  onToggle,
  onTogglePage,
  stages,
  onCandidateStageChange,
  onManageStages,
  queryState,
  searchInput,
  onSearchChange,
  onStageFilterChange,
  onMatchFilterChange,
  onSortChange,
  onOverallRangeChange,
  onCategoryRangeChange,
  onClearAllFilters,

  hasMore,
  loadingMore,
  onLoadMore
}: CandidatesTableProps) {
  const compact = useAnalysisSheetOpen();

  const { ref: loadMoreRef, inView } = useInView({ threshold: 0, rootMargin: "300px", });

  // Default landing stage for a candidate that has no stage yet — the first
  // stage in the configured order (e.g. "Applied"). Falls back to "Applied"
  // string when the stages map is empty so the chip still renders.
  const defaultStage = sortedStages(stages)[0]?.name ?? "Applied";

  // Filtering, searching, and sorting are now backend-driven (see
  // useCandidateQuery). The page renders exactly what the API returned —
  // no client-side narrowing here. The `searchInput` debounced through
  // useCandidateQuery only echoes back into the toolbar text field.

  useEffect(() => {
    if (!inView) return;
    if (!hasMore) return;
    if (loadingMore) return;

  
    onLoadMore?.();
  }, [inView, hasMore, loadingMore, onLoadMore]);

  // Header checkbox tri-state — reflects the current page's visible rows.
  const visibleIds = candidates.map((c) => c.resume_id);
  const visibleSelectedCount = selectable && selectedIds
    ? visibleIds.filter((id) => selectedIds.has(id)).length
    : 0;
  const allVisibleSelected = visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  // Render the toolbar + chips only when the parent wires the full query
  // state (i.e. the live results view). The selection-only / "show selected"
  // view leaves these props undefined and renders just the table.
  const showToolbar = !!queryState && !!onStageFilterChange && !!onSortChange;

  const sortRules: SortRule[] = queryState?.sort ?? [];

  return (
    <div className="space-y-4">
      {showToolbar && queryState && (
        <>
          <CandidatesToolbar
            state={queryState}
            searchInput={searchInput ?? ""}
            stages={stages}
            categories={categories}
            onSearchChange={onSearchChange!}
            onStageChange={onStageFilterChange!}
            onMatchChange={onMatchFilterChange!}
            onOverallChange={onOverallRangeChange!}
            onCategoryChange={onCategoryRangeChange!}
          />
          {hasActiveFilters(queryState) && (
            <ActiveFilterChips
              state={queryState}
              onRemoveStage={(s) => onStageFilterChange!(queryState.stage.filter((x) => x !== s))}
              onRemoveMatch={(m) => onMatchFilterChange!(queryState.match.filter((x) => x !== m))}
              onClearOverall={() => onOverallRangeChange!(undefined)}
              onClearCategory={(name) => onCategoryRangeChange!(name, undefined)}
              onClearAll={() => onClearAllFilters?.()}
            />
          )}
        </>
      )}

      {/* Table.
          Width strategy: use `table-fixed` with percentage-style flexible
          columns so the table always fills the container, no matter how many
          rubric categories there are. Candidate column is sticky-left so the
          name stays visible if the user does end up scrolling horizontally
          on a narrow viewport. Rank lives as a tiny badge on the avatar
          instead of its own column. */}
      {/* <div className="rounded-2xl border border-[#E8E5DF] bg-white overflow-hidden">
        <div className="overflow-x-auto"> */}
      <div className="rounded-2xl border border-[#E8E5DF] bg-white overflow-hidden">
        <div className="max-h-[65vh] overflow-y-auto overflow-x-auto">
          <table className="min-w-full w-full text-sm table-fixed">
            <colgroup>
              {selectable && <col className="w-10" />}
              <col className={compact ? "w-44" : "w-44 sm:w-48"} />
              {!compact && <col className="w-28" />}
              <col className="w-17.5" />
              {/* Voice screen — same width as Score so the category columns
                  after it keep their alignment. */}
              {!compact && <col className="w-17.5" />}
              {!compact && categories.map((cat) => (
                <col key={cat.name} className="w-22.5" />
              ))}
              <col className="w-28" />
              <col className="w-24" />
              {!compact && <col className="w-11" />}
            </colgroup>
            <thead className="sticky top-0 z-20 bg-[#F5F3EE]">
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
                {showToolbar ? (
                  <SortableHeader
                    field="candidate_name"
                    sort={sortRules}
                    onChange={onSortChange!}
                    className="pl-3 pr-2 py-2.5 sticky left-0 z-10 bg-[#F5F3EE]"
                  >
                    Candidate
                  </SortableHeader>
                ) : (
                  <th className="pl-3 pr-2 py-2.5 text-left text-[11px] font-semibold text-[#737373] uppercase tracking-wide sticky left-0 z-10 bg-[#F5F3EE]">Candidate</th>
                )}
                {!compact && (
                  <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-[#737373] uppercase tracking-wide">Role</th>
                )}
                {showToolbar ? (
                  <SortableHeader
                    field="overall_score"
                    sort={sortRules}
                    onChange={onSortChange!}
                    align="center"
                    className="px-2 py-2.5"
                    subtitle="/ 100"
                  >
                    Score
                  </SortableHeader>
                ) : (
                  <th className="px-2 py-2.5 text-center text-[11px] font-semibold text-[#737373] uppercase tracking-wide">
                    <span className="block">Score</span>
                    <span className="block font-normal text-[10px] text-[#BDB8AE] normal-case tracking-normal">/ 100</span>
                  </th>
                )}
                {!compact && (
                  <th className="px-2 py-2.5 text-center text-[11px] font-semibold text-[#737373] uppercase tracking-wide">
                    <span className="block">Voice</span>
                    <span className="block font-normal text-[10px] text-[#BDB8AE] normal-case tracking-normal">
                      screen
                    </span>
                  </th>
                )}
                {!compact && categories.map((cat) => {
                  const subtitle = `/ 10 %`;
                  // const subtitle = `/ 10 · ${cat.weight}%`;
                  const tooltipLabel = (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">{cat.name}</span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs font-medium">{cat.name}</p>
                        <p className="text-[10px] opacity-80">scored out of 10</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                  return showToolbar ? (
                    <SortableHeader
                      key={cat.name}
                      field={`cat:${cat.name}`}
                      sort={sortRules}
                      onChange={onSortChange!}
                      align="center"
                      // max-w-0 forces the cell to obey its colgroup width
                      // instead of expanding to fit the (long) category
                      // name, which is what makes truncate actually clip.
                      className="px-2 py-2.5 max-w-0"
                      subtitle={subtitle}
                    >
                      {tooltipLabel}
                    </SortableHeader>
                  ) : (
                    <th
                      key={cat.name}
                      className="px-2 py-2.5 text-center text-[11px] font-semibold text-[#737373] uppercase tracking-wide max-w-0"
                    >
                      <span className="block truncate">{tooltipLabel}</span>
                      <span className="block font-normal text-[10px] text-[#BDB8AE] normal-case tracking-normal">{subtitle}</span>
                    </th>
                  );
                })}
                {showToolbar ? (
                  <SortableHeader
                    field="stage"
                    sort={sortRules}
                    onChange={onSortChange!}
                    className="px-2 py-2.5"
                  >
                    Stage
                  </SortableHeader>
                ) : (
                  <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-[#737373] uppercase tracking-wide">Stage</th>
                )}
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-[#737373] uppercase tracking-wide">Match</th>
                {!compact && <th className="px-2 py-2.5"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5DF]">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <SkeletonRow
                    key={`sk-${i}`}
                    categories={categories}
                    compact={compact}
                    selectable={selectable}
                  />
                ))
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={3 + (compact ? 0 : categories.length + 3) + (selectable ? 1 : 0)} className="px-5 py-10 text-center text-sm text-[#737373]">
                    {queryState && hasActiveFilters(queryState)
                      ? "No candidates match the current filters."
                      : "No candidates yet."}
                  </td>
                </tr>
              ) : candidates.map((c,index) => (
                <CandidateRow
                  index={index}
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
          {hasMore && (
            <div ref={loadMoreRef} className="w-full">
              <div className="w-full flex items-center justify-center gap-3 py-8 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#C85A17] border-t-transparent" />
                <span>Loading more candidates...</span>
              </div>
            </div>
          )}
        </div>
      </div>



    </div>
  );
}

function CandidateRow({
  candidate, categories, compact, stage, stages, onStageChange, onManageStages,
  selectable, selected, onToggle,
  index,
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
  index: number;
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
              {index + 1}
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
      {!compact && (
        <td className="px-2 py-3 text-center align-middle">
          <VoiceCell candidate={candidate} />
        </td>
      )}
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


/**
 * Voice-round outcome for one candidate, at a glance.
 *
 * The score alone would mislead: a call still ringing, one that never
 * connected, and one that produced a real interview are three different states
 * and only the last has a number worth reading. So the cell shows the STATE
 * first and the score only once there is one.
 */
function VoiceCell({ candidate }: { candidate: RankedCandidate }) {
  const status = candidate.voice_status ?? null;
  const score = candidate.voice_score ?? null;
  const rec = candidate.voice_recommendation ?? null;

  if (!status) {
    return <span className="text-xs text-[#D4D4D4]" title="No call placed yet">—</span>;
  }

  if (status !== "ready") {
    const label: Record<string, string> = {
      queued: "Queued",
      calling: "Calling",
      in_interview: "In call",
      processing: "Scoring",
      unreachable: "No answer",
    };
    const pending = status === "calling" || status === "in_interview" || status === "processing";
    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-medium ${
          status === "unreachable" ? "text-amber-700" : "text-[#737373]"
        }`}
      >
        {pending && (
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C85A17]" aria-hidden="true" />
        )}
        {label[status] ?? status}
      </span>
    );
  }

  const tone =
    rec === "advance" ? "text-green-700" : rec === "reject" ? "text-red-600" : "text-[#0F0F0F]";
  return (
    <div className="flex flex-col items-center gap-0.5" title={rec ? `Recommendation: ${rec}` : undefined}>
      <span className={`text-sm font-bold leading-none ${tone}`}>
        {score == null ? "—" : Math.round(score)}
      </span>
      {rec && <span className="text-[10px] capitalize leading-none text-[#737373]">{rec}</span>}
    </div>
  );
}
