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
import { SelectedCandidatesProvider, useSelectedCandidates } from "@/modules/screening/hooks/screening/custom/useSelectedCandidates";
import type { RankedCandidate, RubricCategory } from "@/types";
import { DEFAULT_STAGES } from "@/lib/stages";
import { StagesDialog } from "@/components/screening/StagesDialog";
import { useScreeningDetailsNavigation } from "@/modules/screening/hooks/shared/useScreeningDetailNavigation";
import { ScreeningToolbar } from "@/modules/screening/components/Screening/filters/ScreeningToolbar";
import { CustomMenuButton } from "@/modules/screening/components/shared/MenuButton"
import { type ScreeningDetailsSearchParams } from "@/modules/screening/types/searchSchema"
import { CircleCheck, Archive } from "lucide-react";
import AnalysisSheetSkeleton from "@/modules/screening/components/Screening/AnalysisSheetSkeleton";
import CandidateMultiSelectToolBar from "@/modules/screening/components/Screening/CandidateMultiSelectToolBar";


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
    setRescoreMode: (mode: boolean) => void;
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

    const { selectedCandidates,showSelectedOnly,clearSelection } = useSelectedCandidates();

    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [showStages, setShowStages] = useState(false);


    const { screening, isPending: isJobDetailsFetching, error } = useScreening(id);

    const changeStageMutation = useChangeCandidateStageMutation(id);
    const saveStagesMutation = useSaveScreeningStagesMutation(id, screening!);


    const candidateQuery = useCandidateQuery(id, { limit: PAGE_SIZE });


    const { query: ScreeningResultsQuery, setScreenType } = candidateQuery;
    const { data, isLoading, isFetching, fetchNextPage, isFetchingNextPage, hasNextPage } = ScreeningResultsQuery;




    const candidates = data?.pages.flatMap((page) => page.items) ?? []





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

                <div className="my-3 flex items-center justify-between gap-2">
                    <ScreeningToolbar categories={(screening.rubric as any)?.categories ?? []} candidateQuery={candidateQuery} stages={stagesMap} />
                    <CustomMenuButton selectedOption={search.screenType} options={options} handleOptionClick={(e: TableOptions) => {
                        setScreenType(e as ScreeningDetailsSearchParams["screenType"]);
                        clearSelection();
                        }} align="end" />
                </div>


                <div className="overflow-x-auto">
                    {(candidates.length > 0 ||
                        (totalCandidates > 0) ||
                        (!showSelectedOnly)) &&
                        (() => {
                            const selectedList = candidates
                                .filter(candidate => selectedCandidates.has(candidate.resume_id))
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

                                    categories={rubricCategories}
                                    selectable={rescoreMode}

                                    stages={stagesMap}
                                    onCandidateStageChange={handleCandidateStageChange}
                                    onManageStages={() => setShowStages(true)}

                                />
                            );
                        })()}
                </div>

                {/* Skeleton placeholder for the analysis sheet while data is loading.
                    The real AnalysisSheet mounts inside CandidateRow, so it doesn't
                    exist until candidate data arrives. This fills the 600px gap. */}
                {(isLoading || candidates.length === 0) && analysisOpen && (
                    <AnalysisSheetSkeleton />
                )}


                <StagesDialog
                    open={showStages}
                    onClose={() => setShowStages(false)}
                    stages={stagesMap}
                    onSave={saveStagesMutation.mutate}
                />
            </div>



            <CandidateMultiSelectToolBar
            isMultiSelectMode={isMultiSelectMode}
                analysisOpen={analysisOpen}
                setIsMultiSelectMode={setRescoreMode}
                stages={screening.stages}
                type={search.screenType}
            />
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
    const { id, } = useParams({ strict: false }) as { id: string };
    return (
        <SelectedCandidatesProvider screening_id={id} >
            <ScreeningDetailContent
                setCurrentTab={setCurrentTab}
                setSourceMode={setSourceMode}
                rescoreMode={rescoreMode}
                analysisOpen={analysisOpen}
                setRescoreMode={setRescoreMode}
            />
        </SelectedCandidatesProvider>
    );
}
