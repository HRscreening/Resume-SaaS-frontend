import { useState, useEffect, useMemo } from "react";
import { Link, useParams, } from "@tanstack/react-router";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";

import { useScreening } from "@/modules/screening/hooks/shared/useScreening"
import { useSaveScreeningStagesMutation, useChangeCandidateStageMutation } from "@/modules/screening/hooks/screening/queries/stages.query"
import { useCandidateQuery } from "@/modules/screening/hooks/screening/custom/useCandidateQuery";
import type { StagesMap, HiringStage } from "@/types";
import { ANALYSIS_SHEET_WIDTH } from "@/modules/screening/components/Screening/AnalysisSheet";
import { CandidatesTable } from "@/modules/screening/components/Screening/CandidatesTable";
import { toast } from "sonner";
import { useGetBatchesQuery } from "@/modules/screening/hooks/shared/batch.hook";
import ResumeScoringProgress from "@/modules/screening/components/Screening/resumeScoringProgress";
import { ApplicationQueryKeys } from "@/modules/screening/queryKeys";
import { useScreeningApplicationsMutation } from "@/modules/screening/hooks/application/queries/application.hook";
import {RescoreSelectedCandidatesProvider,useRescoreSelectedCandidates} from "@/modules/screening/hooks/screening/custom/useRescoreSelectedCandidates";
import type { RankedCandidate, RubricCategory } from "@/types";
import { DEFAULT_STAGES } from "@/lib/stages";
import { StagesDialog } from "@/components/screening/StagesDialog";
import { useScreeningDetailsNavigation } from "@/modules/screening/hooks/shared/useScreeningDetailNavigation";
import { ScreeningToolbar } from "@/modules/screening/components/Screening/filters/ScreeningToolbar";
import { CustomMenuButton } from "@/modules/screening/components/shared/MenuButton"
import {type ScreeningDetailsSearchParams} from "@/modules/screening/types/searchSchema"
import { CircleCheck, Archive } from "lucide-react";


const tableOptions = ["All", "Active", "Archived", "Deleted"];

type TableOptions = typeof tableOptions[number];

const options = [
    { icon: <CircleCheck size={12} />, label: tableOptions[1] },
    { icon: <Archive size={12} />, label: tableOptions[2] },
    // { icon: <Trash2 size={12} />, label: tableOptions[3] }
]

type Sections = "Applications" | "Screening";

const PAGE_SIZE = 30;

interface ScreeningDetailProps {
    analysisOpen: boolean;
    setCurrentTab: (tab: Sections) => void;
    setSourceMode: (mode: boolean) => void;
    rescoreMode?: boolean;
    setRescoreMode?: (mode: boolean) => void;
}



function ScreeningDetailContent({
    setCurrentTab,
    setSourceMode,
    rescoreMode = false,
    analysisOpen,
    setRescoreMode,
}: ScreeningDetailProps) {
    const { id } = useParams({ strict: false }) as { id: string };
    const { search, setScreenId, setAnalysisTab } = useScreeningDetailsNavigation()

    const queryClient = useQueryClient();


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
    const [showSelectedOnly, setShowSelectedOnly] = useState(false);

    const { screening, isPending: isJobDetailsFetching, error } = useScreening(id);

    const changeStageMutation = useChangeCandidateStageMutation(id);
    const saveStagesMutation = useSaveScreeningStagesMutation(id, screening!);


    const candidateQuery = useCandidateQuery(id, { limit: PAGE_SIZE });


    const { query: ScreeningResultsQuery,setScreenType } = candidateQuery;
    const { data, isLoading, isFetching, fetchNextPage, isFetchingNextPage, hasNextPage } = ScreeningResultsQuery;




    const candidates = data?.pages.flatMap((page) => page.items) ?? []




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





    if (isJobDetailsFetching && !screening) {
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



    if (
        candidates.length === 0 &&
        screening.screened_cnt === 0 &&
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


    // ! to be fixed: this is a hack to avoid TS error, but it should be fixed in the future
    async function handleCandidateStageChange(
        resume_id: string,
        scoreId: string,
        next: HiringStage
    ) {
        await changeStageMutation.mutateAsync({
            scoreId,
            stage: next,
        });
    }

    const totalCandidates = screening.screened_cnt ?? 0;

    return (
        <div>
            <div className="w-full">
                <div className="my-4 space-y-3">
                    {active_batches?.scoring_batch_ids?.map((batch_id) => (
                        <ResumeScoringProgress key={`scoring-${batch_id}`} screening_id={id} batch_id={batch_id} />
                    ))}
                </div>

                <div className="my-4 flex items-center justify-between gap-2">
                    <ScreeningToolbar categories={(screening.rubric as any)?.categories ?? []} candidateQuery={candidateQuery}  stages={stagesMap}/>
                    <CustomMenuButton selectedOption={search.screenType} options={options} handleOptionClick={(e:TableOptions)=>setScreenType(e as ScreeningDetailsSearchParams["screenType"])}  align="end" />
                </div>


                <div className="overflow-x-auto">
                    {(candidates.length > 0 ||
                        (totalCandidates > 0) ||
                        (!showSelectedOnly)) &&
                        (() => {
                            const selectedList = Object.values(selectedDetails)
                                .filter((c) => selectedCandidates.has(c.resume_id))
                                .sort((a, b) => a.rank - b.rank);
                            const tableCandidates = showSelectedOnly ? selectedList : candidates;
                            return (
                                <CandidatesTable
                                    screening_id={id}
                                    candidates={tableCandidates}

                                    loading={isLoading}
                                    hasMore={hasNextPage}
                                    loadingMore={isFetchingNextPage}
                                    onLoadMore={fetchNextPage}
                                    backgGroundFetching={isFetching}
                                    

                                    selectedIds={selectedCandidates}
                                    categories={rubricCategories}
                                    selectable={rescoreMode}
                                    onTogglePage={togglePage}
                                    onToggle={toggleSelection}

                                    stages={stagesMap}
                                    onCandidateStageChange={handleCandidateStageChange}
                                    onManageStages={() => setShowStages(true)}

                                />
                            );
                        })()}
                </div>


                <StagesDialog
                    open={showStages}
                    onClose={() => setShowStages(false)}
                    stages={stagesMap}
                    onSave={saveStagesMutation.mutate}
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
                                    className={`flex items-center gap-2 text-xs ${totalSelected === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
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
    analysisOpen,
}: ScreeningDetailProps) {
    const { id } = useParams({ strict: false }) as { id: string };
    return (
        <RescoreSelectedCandidatesProvider screening_id={id}>
            <ScreeningDetailContent
                setCurrentTab={setCurrentTab}
                setSourceMode={setSourceMode}
                rescoreMode={rescoreMode}
                analysisOpen={analysisOpen}
                setRescoreMode={setRescoreMode}
            />
        </RescoreSelectedCandidatesProvider>
    );
}
