import { useState, useRef, useEffect } from "react";
import { Link, useParams, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getScreening, getBatchProgress, exportResults,
    uploadResumesToJob, addResumesToJob, rescoreScreening,
    saveScreeningStages, updateCandidateStage,
} from "@/lib/api";
import { useCandidateQuery } from "@/controllers/screening/useCandidateQuery";
import type { ScreeningListItem, StagesMap, HiringStage, PaginatedResults } from "@/types";
import { formatDate, truncate } from "@/lib/utils";
import type { RankedCandidate, RubricCategory } from "@/types";
import { DEFAULT_STAGES } from "@/lib/stages";
import { StagesDialog } from "@/components/screening/StagesDialog";
import { useAnalysisSheetOpen, setOpenAnalysisSheet, ANALYSIS_SHEET_WIDTH } from "@/components/screening/AnalysisSheet";
import { TIERS, getTier, TierSection, type TierId } from "@/components/screening/TierSection";

import { ProcessingAccordion } from "@/components/screening/ProcessingAccordion";
import { CandidatesTable } from "@/components/screening/CandidatesTable";
import { hasActiveFilters } from "@/components/screening/filters/queryEncoding";
import { toast } from "sonner";
import {useGetBatchesQuery} from "@/modules/screening/hooks/batch.hook"
import ResumeScoringProgress from "@/modules/screening/components/Processing/resumeScoringProgress"


import { useAuth } from "@/hooks/useAuth";


type Sections = "Applications" | "Screening"

const PAGE_SIZE = 10;

export default function ScreeningDetail() {
    const { id } = useParams({ strict: false }) as { id: string };
    const search = useSearch({ strict: false }) as { saved?: number } & Record<string, unknown>;
    const queryClient = useQueryClient();


    const navigate = useNavigate();

    const { user } = useAuth();

      const { data: active_batches } = useGetBatchesQuery(id);

      useEffect(() => {
        console.log("Active batches updated:", active_batches);

      }, [active_batches])
    
    const [rescoring, setRescoring] = useState(false);
    const [rescoreError, setRescoreError] = useState<string | null>(null);
    const [showRubric, setShowRubric] = useState(false);
    const [showStages, setShowStages] = useState(false);
    const analysisOpen = useAnalysisSheetOpen();

    // Rescore selection mode — flipped on by the Rescore button in the action
    // row. `selectedIds` is the cross-page basket; pagination / search / filter
    // changes only swap the visible rows, never the selection.
    const [rescoreMode, setRescoreMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    // Candidate data cache for the "Show selected only" view — without this,
    // toggling on the view would hide selections that came from other pages.
    // Populated whenever we see a selected candidate in the current results page.
    const [selectedDetails, setSelectedDetails] = useState<Record<string, RankedCandidate>>({});
    const [lastClickedId, setLastClickedId] = useState<string | null>(null);
    const [showSelectedOnly, setShowSelectedOnly] = useState(false);



    // Synchronous status hint from the screenings-list cache. Used to gate the
    // batch-progress query on cold cache so we don't fire a request that 404s
    // for a draft screening (no batch row exists yet). On warm cache the hint
    // is reliable; on direct URL paste it's `undefined` and we let the query
    // fire — a 404 for draft is a rare cost.
    const cachedListItem = queryClient
        .getQueryData<ScreeningListItem[]>(["screenings"])
        ?.find((s) => s.id === id);
    const knownIsDraft = cachedListItem?.status === "draft";

    const { data: screening, isLoading, error } = useQuery({
        queryKey: ["screening", id],
        queryFn: () => getScreening(id),
        refetchInterval: (query) => {
            const s = query.state.data;
            if (!s || ["completed", "failed", "draft"].includes(s.status)) return false;
            return 5000;
        },
    });

    // Fire in PARALLEL with the screening query when we have a non-draft hint
    // (or no hint at all). The previous `enabled: !!screening` gate forced a
    // sequential waterfall — first paint waited for two roundtrips instead of
    // one. The 404-on-draft case is handled by React Query's retry:1 default
    // and the empty render path below.
    // const { data: progress } = useQuery({
    //     queryKey: ["batch-progress", id],
    //     queryFn: () => getBatchProgress(id),
    //     enabled: !knownIsDraft && (!screening || screening.status !== "draft"),
    //     refetchInterval: (query) => {
    //         const status = query.state.data?.status;
    //         if (status === "completed" || status === "failed") return false;
    //         return 3000;
    //     },
    // });

    // const batchDone = progress?.status === "completed" || progress?.status === "failed";
    const batchDone = active_batches?.scoring_batch_ids?.length === 0
    // Backend-driven query state (filters, sort, search, pagination) lives in
    // the URL via useCandidateQuery. The hook also owns the results query,
    // so we don't run a separate useQuery here.
    const candidateQuery = useCandidateQuery(id, {
        pageSize: PAGE_SIZE,
        pollWhileProcessing: true,
        batchDone,
    });
    const {
        state: queryState,
        searchInput,
        setSearch,
        setStage,
        setMatch,
        setSort,
        setOverallRange,
        setCategoryRange,
        setPage: setQueryPage,
        clearAll,
        prefetchPage,
        query: resultsQuery,
    } = candidateQuery;
    const resultsPage = resultsQuery.data;
    const resultsFetching = resultsQuery.isFetching;
    const resultsPlaceholder = resultsQuery.isPlaceholderData;
    const currentPage = queryState.page;
    const candidates = resultsPage?.items ?? [];
    const serverTotal = resultsPage?.total ?? 0;
    // Only show the in-table skeleton on a cold page-switch — `isFetching` is
    // also true during the background poll while the previous page's data is
    // already cached, and we don't want to wipe the UI then.
    const pageLoading = resultsFetching && (!resultsPage || resultsPlaceholder);

    useEffect(() => {
        if (batchDone) {
            queryClient.invalidateQueries({ queryKey: ["results", id] });
            queryClient.invalidateQueries({ queryKey: ["screening", id] });
            // Belt-and-suspenders: the upload mutation also invalidates ["usage"],
            // but if the user navigates away mid-processing and comes back, that
            // handler is gone. Batch completion is the stable trigger to make sure
            // the sidebar counter ends up correct.
            queryClient.invalidateQueries({ queryKey: ["usage"] });
        }
    }, [batchDone, id, queryClient]);

    // Show a "Rubric saved" toast after returning from EditRubric (?saved=1).
    // Auto-dismiss after a few seconds; strip the saved=1 search param so a
    // refresh won't re-fire it. Preserves any filter/sort state already in
    // the URL.
    useEffect(() => {
        if (search.saved !== 1) return;
        toast.success("Rubric saved", { duration: 3500 });
        setRescoreMode(true);
        const { saved: _saved, ...rest } = search as Record<string, unknown>;
        navigate({
            to: "/screenings/$id",
            params: { id },
            search: rest as never,
            replace: true,
        });
    }, [search, id, navigate]);

    async function submitRescore() {
        if (selectedIds.size === 0 || rescoring) return;
        setRescoring(true);
        setRescoreError(null);

        // Optimistically flip status so ProcessingAccordion renders immediately.
        queryClient.setQueryData(
            ["screening", id],
            (old: typeof screening) =>
                old ? { ...old, status: "processing" as const, scored_resumes: 0 } : old,
        );
        queryClient.removeQueries({ queryKey: ["batch-progress", id] });

        try {
            await rescoreScreening(id, { resume_ids: [...selectedIds] });
            queryClient.invalidateQueries({ queryKey: ["batch-progress", id] });
            queryClient.invalidateQueries({ queryKey: ["results", id] });
            queryClient.invalidateQueries({ queryKey: ["screening", id] });
            queryClient.invalidateQueries({ queryKey: ["screenings"] });
            exitRescoreMode();
        } catch (err) {
            setRescoreError(err instanceof Error ? err.message : "Failed to start rescore");
            queryClient.invalidateQueries({ queryKey: ["screening", id] });
        } finally {
            setRescoring(false);
        }
    }

    function exitRescoreMode() {
        setRescoreMode(false);
        setSelectedIds(new Set());
        setSelectedDetails({});
        setLastClickedId(null);
        setShowSelectedOnly(false);
    }

    function rememberDetails(ids: string[]) {
        setSelectedDetails((prev) => {
            const next = { ...prev };
            for (const rid of ids) {
                if (!next[rid]) {
                    const c = candidates.find((x) => x.resume_id === rid);
                    if (c) next[rid] = c;
                }
            }
            return next;
        });
    }

    function toggleSelection(rid: string, e: React.MouseEvent | React.ChangeEvent) {
        const me = e as React.MouseEvent;
        const visibleList = (showSelectedOnly
            ? Object.values(selectedDetails).filter((c) => selectedIds.has(c.resume_id))
            : candidates
        ).map((c) => c.resume_id);

        setSelectedIds((prev) => {
            const next = new Set(prev);
            const added: string[] = [];
            if (me.shiftKey && lastClickedId && visibleList.includes(lastClickedId) && visibleList.includes(rid)) {
                const a = visibleList.indexOf(lastClickedId);
                const b = visibleList.indexOf(rid);
                const [lo, hi] = a < b ? [a, b] : [b, a];
                for (let i = lo; i <= hi; i++) {
                    if (!next.has(visibleList[i])) added.push(visibleList[i]);
                    next.add(visibleList[i]);
                }
            } else if (next.has(rid)) {
                next.delete(rid);
            } else {
                next.add(rid);
                added.push(rid);
            }
            if (added.length > 0) rememberDetails(added);
            return next;
        });
        setLastClickedId(rid);
    }

    function togglePage(ids: string[], select: boolean) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            const added: string[] = [];
            for (const rid of ids) {
                if (select) {
                    if (!next.has(rid)) added.push(rid);
                    next.add(rid);
                } else {
                    next.delete(rid);
                }
            }
            if (added.length > 0) rememberDetails(added);
            return next;
        });
    }


    // Keyboard shortcuts (only active in rescore mode).
    useEffect(() => {
        if (!rescoreMode) return;
        function onKeyDown(e: KeyboardEvent) {
            // Don't hijack typing in inputs.
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;

            if (e.key === "Escape") {
                e.preventDefault();
                if (showSelectedOnly) setShowSelectedOnly(false);
                else exitRescoreMode();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
                e.preventDefault();
                const visible = (showSelectedOnly
                    ? Object.values(selectedDetails).filter((c) => selectedIds.has(c.resume_id))
                    : candidates
                ).map((c) => c.resume_id);
                togglePage(visible, true);
            }
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rescoreMode, showSelectedOnly, selectedIds, selectedDetails]);




    // POST /api/screenings/:id/save-stages — body is the full StagesMap.
    // Always send the latest map; the endpoint replaces server state outright.
    // Must be declared before any early return so hook order stays stable.
    const saveStagesMutation = useMutation({
        mutationFn: (next: StagesMap) => saveScreeningStages(id, next),
        onMutate: async (next) => {
            await queryClient.cancelQueries({ queryKey: ["screening", id] });
            const prev = queryClient.getQueryData<typeof screening>(["screening", id]);
            queryClient.setQueryData(
                ["screening", id],
                (old: typeof screening) => (old ? { ...old, stages: next } : old),
            );
            return { prev };
        },
        onError: (_err, _next, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(["screening", id], ctx.prev);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["screening", id] });
        },
    });

    async function handleSaveStages(next: StagesMap): Promise<void> {
        await saveStagesMutation.mutateAsync(next);
    }



    // Cold-cache first paint: render a lightweight skeleton instead of a
    // full-page spinner. The same screening fetch is in flight in the
    // background — when it lands, the full UI swaps in.
    if (isLoading && !screening) {
        return (
            <div className="px-4 pt-6 sm:px-6 sm:pt-8 md:px-8 max-w-5xl mx-auto">
                <div className="h-7 w-64 bg-[#E8E5DF] rounded animate-pulse mb-3" />
                <div className="h-4 w-32 bg-[#E8E5DF] rounded animate-pulse mb-6" />
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
                            <div className="h-4 w-40 bg-[#E8E5DF] rounded animate-pulse mb-3" />
                            <div className="h-3 w-full bg-[#F5F3EE] rounded animate-pulse mb-2" />
                            <div className="h-3 w-3/4 bg-[#F5F3EE] rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!screening) {
        return (
            <div className="p-4 sm:p-6 md:p-8 text-center">
                <p className="text-sm text-[#737373]">
                    {error instanceof Error ? error.message : "Screening not found."}
                </p>
                <Link to="/screenings" className="text-sm text-[#0F0F0F] underline mt-2 inline-block">
                    Back to screenings
                </Link>
            </div>
        );
    }

    const isDraft = screening.status === "draft";
    const isProcessing = !isDraft && !["completed", "failed"].includes(screening.status);
    const rubricCategories: RubricCategory[] = (screening.rubric as any)?.categories ?? [];
    const stagesMap: StagesMap = screening.stages ?? DEFAULT_STAGES;

    function handleCandidateStageChange(resumeId: string, scoreId: string, next: HiringStage) {
        // Optimistic per-row update across every cached results page for this
        // screening — the row may not be on `currentPage`.
        queryClient.setQueriesData<PaginatedResults>(
            { queryKey: ["results", id] },
            (old) => {
                if (!old) return old;
                return {
                    ...old,
                    items: old.items.map((c) =>
                        c.resume_id === resumeId ? { ...c, stage: next } : c,
                    ),
                };
            },
        );
        updateCandidateStage(scoreId, next).catch(() => {
            queryClient.invalidateQueries({ queryKey: ["results", id] });
        });
    }

    // Backend's `total` is authoritative for pagination. Fall back to the
    // screening's scored count while the first page is still loading, so the
    // page UI doesn't flash empty before the response lands.
    const totalCandidates = serverTotal || screening.scored_resumes || screening.total_resumes || candidates.length;
    const hasAnyCandidates = candidates.length > 0 || totalCandidates > 0;
    // The current page has no rows, but filters are active and the screening
    // does have scored candidates — i.e. the filters just matched nothing. Keep
    // the action buttons visible (so the toolbar stays put) but disable the ones
    // that operate on visible rows.
    const filtersMatchedNothing =
        candidates.length === 0 && hasActiveFilters(queryState) && screening.scored_resumes > 0;

    return (
        <div>


            <div className="w-full space-y-4">

                {/* Processing accordion — combined banner + per-file drill-down */}
                {/* {isProcessing && (
                    <ProcessingAccordion
                        progress={progress ?? null}
                        totalFiles={screening.total_resumes}
                        uploadNonce={uploadNonce}
                    />
                )} */}

                {/* Partial failures
                {!isProcessing && progress && (progress.failed_count ?? 0) > 0 && (
                    <FailedView progress={progress} hasResults={candidates.length > 0} />
                )} */}

                {/* Total failure */}
                {/* {screening.status === "failed" && candidates.length === 0 && !(progress && (progress.failed_count ?? 0) > 0) && (
                    <div className="bg-red-50 rounded-2xl border border-red-200 p-6 text-center">
                        <p className="text-sm font-semibold text-red-800">Screening failed</p>
                        <p className="text-xs text-red-600 mt-1">All resumes failed to process. Please check the job description and try again.</p>
                    </div>
                )} */}


                <div className="my-4 space-y-3">
                    {active_batches?.scoring_batch_ids?.map((batch_id) => (
                        <ResumeScoringProgress key={`parsing-${batch_id}`} screening_id={id} batch_id={batch_id} />
                    ))}
                </div>

                {/* Flat results table with search, filter, stage & match columns,
              and bottom-center pagination. Visible during processing too —
              rows stream in as they're scored. In rescoreMode, the table
              shows a checkbox column; selection is owned by ScreeningDetail
              so it survives page/filter/search changes. */}
                {/* Keep the table mounted when filters are active even if they
              return zero rows — otherwise the page goes blank and the user
              has no way to see/clear the filters. CandidatesTable renders the
              headers + an empty-state message in that case. The "show selected
              only" view is excluded since it has no filter toolbar. */}
                {(candidates.length > 0 ||
                    (pageLoading && totalCandidates > 0) ||
                    (!showSelectedOnly && hasActiveFilters(queryState))) && (() => {
                        const selectedList = Object.values(selectedDetails)
                            .filter((c) => selectedIds.has(c.resume_id))
                            .sort((a, b) => a.rank - b.rank);
                        const tableCandidates = showSelectedOnly ? selectedList : candidates;
                        const tableTotal = showSelectedOnly ? selectedList.length : totalCandidates;
                        return (
                            <CandidatesTable
                                candidates={tableCandidates}
                                categories={rubricCategories}
                                page={showSelectedOnly ? 1 : currentPage}
                                pageSize={PAGE_SIZE}
                                total={tableTotal}
                                onPageChange={(p) => {
                                    setOpenAnalysisSheet(null);
                                    setQueryPage(p);
                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                loading={!showSelectedOnly && pageLoading}
                                onPrefetchPage={prefetchPage}
                                selectable={rescoreMode}
                                selectedIds={selectedIds}
                                onToggle={toggleSelection}
                                onTogglePage={togglePage}
                                stages={stagesMap}
                                onCandidateStageChange={handleCandidateStageChange}
                                onManageStages={() => setShowStages(true)}
                                // Filter/sort/search are disabled in the "show selected
                                // only" view — those rows come from cross-page memory and
                                // sorting/filtering them server-side would be a category
                                // error. Toolbar reappears as soon as the user toggles
                                // back to the full list.
                                {...(showSelectedOnly
                                    ? {}
                                    : {
                                        queryState,
                                        searchInput,
                                        onSearchChange: setSearch,
                                        onStageFilterChange: setStage,
                                        onMatchFilterChange: setMatch,
                                        onSortChange: setSort,
                                        onOverallRangeChange: setOverallRange,
                                        onCategoryRangeChange: setCategoryRange,
                                        onClearAllFilters: clearAll,
                                    })}
                            />
                        );
                    })()}

                {/* Rescore mode hint bar */}
                {rescoreMode && candidates.length > 0 && (
                    <p className="text-[11px] text-[#737373] -mt-2">
                        <span className="font-medium text-[#404040]">Rescore mode</span> · Click rows or checkboxes to select · Shift+Click for range · Ctrl/Cmd+A selects current page · Esc to exit
                    </p>
                )}

                {/* Stages management modal */}
                <StagesDialog
                    open={showStages}
                    onClose={() => setShowStages(false)}
                    stages={stagesMap}
                    onSave={handleSaveStages}
                />





            </div>

            {/* Rescore action bar — sticky bottom, only in rescore mode */}
            {rescoreMode && (() => {
                const totalSelected = selectedIds.size;
                const onPageCount = candidates.filter((c) => selectedIds.has(c.resume_id)).length;
                return (
                    <div
                        className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#E8E5DF] bg-white/95 backdrop-blur px-6 py-3 flex items-center justify-between gap-4 transition-[padding] duration-200 ease-out"
                        style={{ paddingRight: analysisOpen ? ANALYSIS_SHEET_WIDTH + 24 : 24 }}
                    >
                        <div className="flex items-center gap-4 flex-wrap">
                            <span className="text-sm font-semibold text-[#0F0F0F]">
                                {totalSelected} selected
                                {!showSelectedOnly && totalSelected > 0 && (
                                    <span className="font-normal text-[#737373] ml-1.5">
                                        ({onPageCount} on this page)
                                    </span>
                                )}
                            </span>
                            <label className={`flex items-center gap-2 text-xs ${totalSelected === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} text-[#404040]`}>
                                <input
                                    type="checkbox"
                                    checked={showSelectedOnly}
                                    disabled={totalSelected === 0}
                                    onChange={(e) => setShowSelectedOnly(e.target.checked)}
                                    className="h-3.5 w-3.5 accent-[#C85A17]"
                                />
                                Show selected only
                            </label>
                            {rescoreError && (
                                <span className="text-xs text-red-600">{rescoreError}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={exitRescoreMode}
                                disabled={rescoring}
                                className="h-9 px-4 text-sm font-medium text-[#404040] border border-[#D4D4D4] rounded-xl hover:bg-[#F5F3EE] disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                disabled={totalSelected === 0 || rescoring}
                                className="h-9 px-4 text-sm font-medium text-[#404040] border border-[#D4D4D4] rounded-xl hover:bg-[#F5F3EE] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Clear all
                            </button>
                            <button
                                onClick={submitRescore}
                                disabled={totalSelected === 0 || rescoring}
                                className="h-9 px-4 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {rescoring && <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                                {rescoring ? "Starting…" : `Rescore ${totalSelected} candidate${totalSelected === 1 ? "" : "s"}`}
                            </button>
                        </div>
                    </div>
                );
            })()}
        </div >
    );
}
