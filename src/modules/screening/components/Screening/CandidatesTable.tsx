import type { HiringStage, RubricCategory, StagesMap } from "@/types";
import type { RankedCandidate } from "@/modules/screening/types/screening.type";
import { sortedStages } from "@/lib/stages";

import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { toast } from "sonner";
import { resumeUploadService } from "@/lib/services/index";
import { CandidateRow, SkeletonRow } from "@/modules/screening/components/Screening/CandidateRow";

import { useScreeningDetailsNavigation } from "@/modules/screening/hooks/shared/useScreeningDetailNavigation";
import { useCandidateQuery } from "@/modules/screening/hooks/screening/custom/useCandidateQuery";
import { useSelectedCandidates } from "@/modules/screening/hooks/screening/custom/useSelectedCandidates";
import { useScreeningActions } from "@/modules/screening/hooks/screening/custom/useScreeningActions";
import { ShareReportDialog } from "@/modules/screening/components/Dialogs/ShareReportDialog";
import { useAccount } from "@/hooks/useAccount";

interface CandidatesTableProps {
  screening_id: string;
  candidates: RankedCandidate[];
  categories: RubricCategory[];

  loading?: boolean;
  backgGroundFetching?: boolean;

  selectable?: boolean;

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

}






export function CandidatesTable({
  screening_id,
  candidates,
  categories,
  loading = false,
  selectable = false,
  stages,
  onCandidateStageChange,
  onManageStages,

  hasMore,
  loadingMore,
  onLoadMore
}: CandidatesTableProps) {

  const { search, setScreenId } = useScreeningDetailsNavigation()
  const { canWrite } = useAccount();

  const { selectedCandidates, toggleSelection, togglePageSelection } = useSelectedCandidates();

  const { menuOptions, getRowStatus,isShareDialogOpen,shareCandidate,setIsShareDialogOpen } = useScreeningActions({ screeningId: screening_id });
  // Derive compact from URL params alone so the table layout is stable on
  // page reload — even before candidate data has loaded.
  const compact = search.tab === "Screening" && !!search.screenId;

  const { ref: loadMoreRef, inView } = useInView({ threshold: 0, rootMargin: "300px", });

  // const screeningSearchParams: ScreeningsSearchParams = screeningSearchSchema.parse(search);



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


  const columnCount = 7 + (compact ? 0 : 1) + (selectable ? 1 : 0);

  const candidatesSelected = selectedCandidates.size > 0;
  // Header checkbox tri-state — reflects the current page's visible rows.
  const visibleIds = candidates.map((c) => c.resume_id);

  const visibleSelectedCount = visibleIds.filter((id) =>
    selectedCandidates.has(id)
  ).length;

  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleSelectedCount === visibleIds.length;

  const someVisibleSelected =
    visibleSelectedCount > 0 &&
    visibleSelectedCount < visibleIds.length;





  return (
    <>

      <div className="space-y-4">


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
                <col className="w-6" />

                {/* Candidate */}
                <col className={compact ? "w-52" : "w-60"} />

                {/* Role */}
                {/* {!compact && */}
                <col className="w-44" />
                {/* } */}

                {/* Experience */}
                <col className="w-24" />

                {/* Score */}
                <col className="w-28" />

                {/* Voice */}
                {/* {!compact && */}
                <col className="w-24" />
                {/* } */}

                {/* Stage */}
                <col className="w-36" />

                {/* Match */}
                <col className="w-32" />

                {/* Action */}
                {!compact && <col className="w-20" />}
              </colgroup>


              <thead className="sticky top-0 z-20 bg-[#F5F3EE]">


                <tr className="w-10 border-b border-[#E8E5DF] bg-[#F5F3EE]">

                  <th className="px-3 py-2.5 bg-[#F5F3EE]">
                    {!compact && (candidatesSelected || selectable) &&
                      <input
                        type="checkbox"
                        aria-label={allVisibleSelected ? "Deselect all on this page" : "Select all on this page"}
                        checked={allVisibleSelected}
                        ref={(el) => { if (el) el.indeterminate = someVisibleSelected; }}
                        onChange={() => {

                          togglePageSelection(visibleIds, !allVisibleSelected)


                        }}
                        className="h-3.5 w-3.5 cursor-pointer accent-[#000000]"
                      />
                    }
                  </th>



                  {/* !Need Reimplementation */}
                  {/* {showToolbar ? (
                  <SortableHeader
                    field="candidate_name"
                    sort={sortRules}
                    onChange={onSortChange!}
                    className="pl-3 pr-2 py-2.5 sticky left-0 z-10 bg-[#F5F3EE]"
                  >
                    Candidate
                  </SortableHeader>
                ) : (
                )} */}
                  <th className="pl-3 pr-2 py-2.5 text-left text-[11px] font-semibold text-[#737373] uppercase tracking-wide sticky left-0 z-10 bg-[#F5F3EE]">Candidate</th>
                  {/* {!compact && ( */}
                  <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-[#737373] uppercase tracking-wide">Role</th>
                  {/* )} */}
                  {/* !Need Reimplementation */}
                  {/* {showToolbar ? (
                  <SortableHeader
                    field="experience_years"
                    sort={sortRules}
                    onChange={onSortChange!}
                    align="center"
                    className="px-2 py-2.5"
                    subtitle="(yrs)"
                  >
                    Experience
                  </SortableHeader>
                ) : ()} */}
                  <th className="px-2 py-2.5 text-center text-[11px] font-semibold text-[#737373] uppercase tracking-wide">
                    <span className="block">Experience</span>
                    <span className="block font-normal text-[10px] text-[#BDB8AE] normal-case tracking-normal">(yrs)</span>
                  </th>
                  {/* {showToolbar ? (
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
                ) : ()} */}
                  <th className="px-2 py-2.5 text-center text-[11px] font-semibold text-[#737373] uppercase tracking-wide">
                    <span className="block">Score</span>
                    <span className="block font-normal text-[10px] text-[#BDB8AE] normal-case tracking-normal">/ 100</span>
                  </th>
                  {/* {!compact && ( */}
                  <th className="px-2 py-2.5 text-center text-[11px] font-semibold text-[#737373] uppercase tracking-wide">
                    <span className="block">Voice</span>
                    <span className="block font-normal text-[10px] text-[#BDB8AE] normal-case tracking-normal">
                      screen
                    </span>
                  </th>
                  {/* )} */}

                  {/* !Need Reimplementation */}
                  {/* {showToolbar ? (
                  <SortableHeader
                    field="stage"
                    sort={sortRules}
                    onChange={onSortChange!}
                    className="px-2 py-2.5"
                  >
                    Stage
                  </SortableHeader>
                ) : (
                )} */}
                  <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-[#737373] uppercase tracking-wide">Stage</th>
                  <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-[#737373] uppercase tracking-wide">Match</th>
                  {!compact &&
                    <th className="pl-2 pr-5 py-2.5 text-center text-[11px] font-semibold text-[#737373] uppercase tracking-wide">Action</th>
                  }
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
                    <td
                      colSpan={columnCount}
                      className="px-5 py-10 text-center text-sm text-[#737373]"
                    >
                      No candidates match the current filters.
                    </td>
                  </tr>
                ) : candidates.map((c, index) => (
                  <CandidateRow
                    screening_id={screening_id}
                    index={index}
                    key={c.resume_id}
                    candidate={c}
                    compact={compact}
                    stage={c.stage ?? defaultStage}
                    stages={stages}
                    onStageChange={(s) => onCandidateStageChange(c.resume_id, c.score_id, s)}
                    onManageStages={onManageStages}
                    selectable={selectable}
                    selected={selectedCandidates.has(c.resume_id)}
                    onToggle={toggleSelection}
                    isOpen={search.screenId === c.resume_id}
                    setScreenId={setScreenId}

                    MenuOptions={menuOptions}
                    processingStatus={getRowStatus(c.resume_id)}
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
      {canWrite && isShareDialogOpen && shareCandidate && (
        <ShareReportDialog
        screeningId={screening_id}
          candidateName={shareCandidate.candidate_name}
          resumeId={shareCandidate.resume_id}
          open={isShareDialogOpen}
          onClose={() => {
            setScreenId(null);
            setIsShareDialogOpen(false);
          }}
        />
      )}
    </>
  );
}




