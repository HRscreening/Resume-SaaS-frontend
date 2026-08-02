import { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import {
    getScreening, saveScreeningStages, updateCandidateStage,
} from "@/lib/api";
import { useCandidateQuery } from "@/modules/screening/hooks/screening/useCandidateQuery";
import type { ScreeningListItem, StagesMap, HiringStage } from "@/types";
import { useAnalysisSheetOpen, ANALYSIS_SHEET_WIDTH } from "@/components/screening/AnalysisSheet";
import { CandidatesTable } from "@/modules/screening/components/Screening/CandidatesTable";
import { hasActiveFilters } from "@/components/screening/filters/queryEncoding";
import { toast } from "sonner";
import { useGetBatchesQuery } from "@/modules/screening/hooks/batch.hook";
import ResumeScoringProgress from "@/modules/screening/components/Processing/resumeScoringProgress";
import { ApplicationQueryKeys } from "@/modules/screening/queryKeys";
import { useScreeningApplicationsMutation } from "@/modules/screening/hooks/application.hook";
import {
    RescoreSelectedCandidatesProvider,
    useRescoreSelectedCandidates,
} from "@/modules/screening/hooks/useRescoreSelectedCandidates";
import type { RankedCandidate, RubricCategory } from "@/types";
import { DEFAULT_STAGES } from "@/lib/stages";
import { StagesDialog } from "@/components/screening/StagesDialog";

type Sections = "Applications" | "Screening";

const PAGE_SIZE = 30;

interface ScreeningDetailProps {
    setCurrentTab: (tab: Sections) => void;
    setSourceMode: (mode: boolean) => void;
    rescoreMode?: boolean;
    setRescoreMode?: (mode: boolean) => void;
}

function ScreeningDetailContent({
    setCurrentTab,
    setSourceMode,
    rescoreMode = false,
    setRescoreMode,
}: ScreeningDetailProps) {
    const { id } = useParams({ strict: false }) as { id: string };
    const search = useSearch({ strict: false }) as { saved?: number } & Record<string, unknown>;
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: active_batches } = useGetBatchesQuery(id);

    const {
        selectedCandidates,
        selectedDetails,
        toggleSelection: hookToggleSelection,
        togglePageSelection: hookTogglePageSelection,
        clearSelection,
    } = useRescoreSelectedCandidates();

    const { mutateAsync: screenResumesMutate, isPending: isRescoringMutation } = useScreeningApplicationsMutation();

    const [rescoreError, setRescoreError] = useState<string | null>(null);
    const [showStages, setShowStages] = useState(false);
    const analysisOpen = useAnalysisSheetOpen();
    const [showSelectedOnly, setShowSelectedOnly] = useState(false);

    const { data: screening, isLoading, error } = useQuery({
        queryKey: ["screening", id],
        queryFn: () => getScreening(id),
        refetchInterval: (query) => {
            const s = query.state.data;
            if (!s || ["completed", "failed", "draft"].includes(s.status)) return false;
            return 5000;
        },
    });

    const candidateQuery = useCandidateQuery(id, { limit: PAGE_SIZE });

    const {
        state: queryState,
        searchInput,
        setSearch,
        setStage,
        setMatch,
        setSort,
        setOverallRange,
        setCategoryRange,
        clearAll,
        query: resultsQuery,
    } = candidateQuery;

    const resultsFetching = resultsQuery.isFetching;
    const pageLoading = resultsQuery.isLoading;
    const candidates = resultsQuery.data?.pages.flatMap((page) => page.items) ?? [];

    useEffect(() => {
        if (search.saved !== 1) return;
        toast.success("Rubric saved", { duration: 3500 });
        setRescoreMode?.(true);
        const { saved: _saved, ...rest } = search as Record<string, unknown>;
        navigate({
            to: "/screenings/$id",
            params: { id },
            search: rest as never,
            replace: true,
        });
    }, [search, id, navigate, setRescoreMode]);

    async function submitRescore() {
        if (selectedCandidates.size === 0 || isRescoringMutation) return;
        setRescoreError(null);

        try {
            const resume_ids = Array.from(selectedCandidates);
            const result = await screenResumesMutate({
                screening_id: id,
                resume_ids,
                isRescore: true,
            });
            toast.success(result.message || "Candidate rescoring batch started successfully.");
            exitRescoreMode();
        } catch (err) {
            setRescoreError(err instanceof Error ? err.message : "Failed to start rescore");
        }
    }

    function exitRescoreMode() {
        setRescoreMode?.(false);
        clearSelection();
        setShowSelectedOnly(false);
    }

    function toggleSelection(rid: string, e: React.MouseEvent | React.ChangeEvent) {
        const visibleList = (
            showSelectedOnly
                ? Object.values(selectedDetails).filter((c) => selectedCandidates.has(c.resume_id))
                : candidates
        ).map((c) => c.resume_id);

        hookToggleSelection(rid, e, visibleList, candidates);
    }

    function togglePage(ids: string[], select: boolean) {
        hookTogglePageSelection(ids, select, candidates);
    }

    // Keyboard shortcuts (active in rescore mode).
    useEffect(() => {
        if (!rescoreMode) return;
        function onKeyDown(e: KeyboardEvent) {
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;

            if (e.key === "Escape") {
                e.preventDefault();
                if (showSelectedOnly) setShowSelectedOnly(false);
                else exitRescoreMode();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
                e.preventDefault();
                const visible = (
                    showSelectedOnly
                        ? Object.values(selectedDetails).filter((c) => selectedCandidates.has(c.resume_id))
                        : candidates
                ).map((c) => c.resume_id);
                togglePage(visible, true);
            }
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [rescoreMode, showSelectedOnly, selectedCandidates, selectedDetails]);

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

    if (pageLoading) {
        return (
            <div className="flex items-center justify-center gap-3 py-4 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#C85A17] border-t-transparent" />
                <span>Loading ...</span>
            </div>
        );
    }

    if (candidates.length === 0 && resultsFetching) {
        return (
            <div className="flex items-center justify-center gap-3 py-4 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#C85A17] border-t-transparent" />
                <span>Loading ...</span>
            </div>
        );
    }

    if (
        candidates.length === 0 &&
        !pageLoading &&
        !hasActiveFilters(queryState) &&
        screening.scored_resumes_cnt === 0 &&
        !active_batches?.scoring_batch_ids?.length
    ) {
        return (
            <div className="p-4 sm:p-6 md:p-8 text-center">
                <p className="text-sm text-[#737373]">
                    No candidates have been scored yet. Upload resumes to start scoring.
                </p>
                <span
                    className="text-sm text-[#0F0F0F] underline mt-2 inline-block cursor-pointer"
                    onClick={() => {
                        setCurrentTab("Applications");

                        const queries = queryClient.getQueriesData({
                            queryKey: ApplicationQueryKeys.screening(id),
                        });

                        if (queries.length > 0) {
                            const applicationsData = queries[0][1] as InfiniteData<any>;
                            const hasApplications = applicationsData.pages.some(
                                (page) => page.items.length > 0
                            );
                            setSourceMode(hasApplications);
                        } else {
                            setSourceMode(false);
                        }
                    }}
                >
                    Start Screening
                </span>
            </div>
        );
    }

    const rubricCategories: RubricCategory[] = (screening.rubric as any)?.categories ?? [];
    const stagesMap: StagesMap = screening.stages ?? DEFAULT_STAGES;

    function handleCandidateStageChange(resumeId: string, scoreId: string, next: HiringStage) {
        updateCandidateStage(scoreId, next)
            .then(() => {
                // Voice eligibility depends on the Shortlisted stage, so refresh
                // the voice queries — moving a candidate to Shortlisted should
                // immediately surface the Call / Schedule controls.
                queryClient.invalidateQueries({ queryKey: ["voice-candidates", id] });
            })
            .catch(() => {
                queryClient.invalidateQueries({ queryKey: ["results", id] });
            });
    }

    const totalCandidates = screening.scored_resumes_cnt ?? 0;

    return (
        <div>
            <div className="w-full">
                <div className="my-4 space-y-3">
                    {active_batches?.scoring_batch_ids?.map((batch_id) => (
                        <ResumeScoringProgress key={`scoring-${batch_id}`} screening_id={id} batch_id={batch_id} />
                    ))}
                </div>

                <div className="overflow-x-auto">
                    {(candidates.length > 0 ||
                        (pageLoading && totalCandidates > 0) ||
                        (!showSelectedOnly && hasActiveFilters(queryState))) &&
                        (() => {
                            const selectedList = Object.values(selectedDetails)
                                .filter((c) => selectedCandidates.has(c.resume_id))
                                .sort((a, b) => a.rank - b.rank);
                            const tableCandidates = showSelectedOnly ? selectedList : candidates;
                            return (
                                <CandidatesTable
                                    candidates={tableCandidates}
                                    categories={rubricCategories}
                                    loading={!showSelectedOnly && pageLoading}
                                    selectable={rescoreMode}
                                    selectedIds={selectedCandidates}
                                    onToggle={toggleSelection}
                                    onTogglePage={togglePage}
                                    hasMore={resultsQuery.hasNextPage}
                                    loadingMore={resultsQuery.isFetchingNextPage}
                                    onLoadMore={resultsQuery.fetchNextPage}
                                    stages={stagesMap}
                                    onCandidateStageChange={handleCandidateStageChange}
                                    onManageStages={() => setShowStages(true)}
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
                </div>


                <StagesDialog
                    open={showStages}
                    onClose={() => setShowStages(false)}
                    stages={stagesMap}
                    onSave={handleSaveStages}
                />
            </div>

            {rescoreMode &&
                (() => {
                    const totalSelected = selectedCandidates.size;
                    const onPageCount = candidates.filter((c) => selectedCandidates.has(c.resume_id)).length;
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
                                <label
                                    className={`flex items-center gap-2 text-xs ${
                                        totalSelected === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                                    } text-[#404040]`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={showSelectedOnly}
                                        disabled={totalSelected === 0}
                                        onChange={(e) => setShowSelectedOnly(e.target.checked)}
                                        className="h-3.5 w-3.5 accent-[#C85A17]"
                                    />
                                    Show selected only
                                </label>
                                {rescoreError && <span className="text-xs text-red-600">{rescoreError}</span>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={exitRescoreMode}
                                    disabled={isRescoringMutation}
                                    className="h-9 px-4 text-sm font-medium text-[#404040] border border-[#D4D4D4] rounded-xl hover:bg-[#F5F3EE] disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={clearSelection}
                                    disabled={totalSelected === 0 || isRescoringMutation}
                                    className="h-9 px-4 text-sm font-medium text-[#404040] border border-[#D4D4D4] rounded-xl hover:bg-[#F5F3EE] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Clear all
                                </button>
                                <button
                                    onClick={submitRescore}
                                    disabled={totalSelected === 0 || isRescoringMutation}
                                    className="h-9 px-4 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isRescoringMutation && (
                                        <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                    )}
                                    {isRescoringMutation
                                        ? "Starting…"
                                        : `Rescore ${totalSelected} candidate${totalSelected === 1 ? "" : "s"}`}
                                </button>
                            </div>
                        </div>
                    );
                })()}
        </div>
    );
}

export default function ScreeningDetail({
    setCurrentTab,
    setSourceMode,
    rescoreMode,
    setRescoreMode,
}: ScreeningDetailProps) {
    const { id } = useParams({ strict: false }) as { id: string };
    return (
        <RescoreSelectedCandidatesProvider screening_id={id}>
            <ScreeningDetailContent
                setCurrentTab={setCurrentTab}
                setSourceMode={setSourceMode}
                rescoreMode={rescoreMode}
                setRescoreMode={setRescoreMode}
            />
        </RescoreSelectedCandidatesProvider>
    );
}
