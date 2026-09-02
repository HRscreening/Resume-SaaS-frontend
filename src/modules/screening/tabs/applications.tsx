import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import { ApplicationTable } from "@/modules/screening/components/Application/application_table";
import { CustomMenuButton } from "@/modules/screening/components/shared/MenuButton";
import { useSelectedApplications, SelectedApplicationsProvider } from "@/modules/screening/hooks/application/custom/useSelectedApplication";

import { toast } from "sonner";
import ResumeParsingProgress from "@/modules/screening/components/Application/resumeParsingProgress";
import { useGetBatchesQuery } from "@/modules/screening/hooks/shared/batch.hook";
import { ApplicationsToolbar } from "@/modules/screening/components/Application/filters/ApplicationToolbar";
import InfoSheet, { useAnalysisSheetOpen as useInfoSheetOpen, ANALYSIS_SHEET_WIDTH } from "@/modules/screening/components/info_sheet";
import { type ScreeningDetailsSearchParams } from "@/modules/screening/types/searchSchema";
import { Archive, CircleCheck } from 'lucide-react'
import { useScreeningDetailsNavigation } from "@/modules/screening/hooks/shared/useScreeningDetailNavigation";
import { useApplicationQuery } from "@/modules/screening/hooks/application/custom/useApplicationQuery"
import InfoSheetSkeleton from "@/modules/screening/components/Application/InfoSheetSkeleton";
import ApplicationMultiSelectToolBar from "@/modules/screening/components/Application/MultiSelectToolBar";

const PAGE_SIZE = 30;




const tableOptions = ["All", "Active", "Archived", "Deleted"];

type TableOptions = typeof tableOptions[number];

const options = [
    { icon: <CircleCheck size={12} />, label: tableOptions[1] },
    { icon: <Archive size={12} />, label: tableOptions[2] },
    // { icon: <Trash2 size={12} />, label: tableOptions[3] }
]

interface ApplicationPageProps {
    screening_id: string;
    multiSelectOpen: boolean;
    setMultiSelectOpen: (mode: boolean) => void;
    onTabChange?: (tab: "Applications" | "Screening") => void;

}

export function ApplicationPage({ screening_id, onTabChange, multiSelectOpen, setMultiSelectOpen }: ApplicationPageProps) {

    const { search } = useScreeningDetailsNavigation();

    const infoOpen = useInfoSheetOpen();



    const ApplicationQuery = useApplicationQuery(screening_id, { limit: PAGE_SIZE });
    const { query: ApplicationResultsQuery, setType } = ApplicationQuery;
    const { data, isLoading, isFetching, fetchNextPage, isFetchingNextPage, hasNextPage } = ApplicationResultsQuery;

    const { data: active_batches } = useGetBatchesQuery(screening_id);


    const { selectedApplications, showSelectedOnly, clearSelection } = useSelectedApplications(); // Custom hook to manage selected applications state




    // async function submitScreen() {
    //     if (selectedApplications.size === 0) {
    //         setSourceError("No candidates selected for Screening.");
    //         return;
    //     }
    //     setScreening(true);

    //     try {
    //         const resume_ids = Array.from(selectedApplications);
    //         const res = await screenResumesMutate({ screening_id, resume_ids });
    //         toast.success(res.message || "Candidates scoring batch started successfully.");
    //         exitSourceMode();
    //         onTabChange?.("Screening");
    //     }
    //     catch (error) {
    //         setSourceError("Error Screening candidates. Please try again.");
    //     }

    //     setScreening(false);

    // }


    const hasActiveParsing = (active_batches?.parsing_batch_ids?.length ?? 0) > 0;
    const applications = data?.pages.flatMap(page => page.items) ?? [];




    if (
        applications.length === 0 &&
        !isLoading &&
        hasActiveParsing
    ) {
        return (
            <div className="space-y-4">
                <div className="my-4 space-y-3">
                    {active_batches?.parsing_batch_ids?.map((batch_id) => (
                        <ResumeParsingProgress
                            key={`parsing-${batch_id}`}
                            screening_id={screening_id}
                            batch_id={batch_id}
                        />
                    ))}
                </div>

                <p className="text-sm text-[#737373] text-center">
                    Applications are being processed and will appear here soon.
                </p>
            </div>
        );
    }




    return (
        <div >
            <div className="my-4 space-y-3">
                {active_batches?.parsing_batch_ids?.map((batch_id) => (
                    <ResumeParsingProgress key={`parsing-${batch_id}`} screening_id={screening_id} batch_id={batch_id} />
                ))}
            </div>

            <div className="my-3 w-full flex justify-between items-center gap-4">
                <ApplicationsToolbar applicationQuery={ApplicationQuery} />

                <div className="shrink-0 flex items-center gap-2">
                    <CustomMenuButton selectedOption={search.appType} options={options} handleOptionClick={(e: TableOptions) => {
                        setType(e as ScreeningDetailsSearchParams["appType"]);
                        clearSelection();
                    }} />

                    {(!multiSelectOpen && selectedApplications.size == 0) &&
                        <button
                            className="my-2 px-3 py-1 rounded-lg bg-[#0F0F0F] text-white text-sm font-medium cursor-pointer"
                            disabled={applications.length === 0 || search.appType != "Active"} // Disable if no applications or not on "Active" tab
                            onClick={() => {
                                console.log("Applications length:", applications.length, "MultiSelectOpen:", multiSelectOpen, "search.appType:", search.appType);
                                if (!applications || applications.length === 0) {
                                    toast.error("No candidates available for Screening.");
                                    return;
                                }

                                if (!multiSelectOpen) {
                                    setMultiSelectOpen(true);
                                } else {
                                    clearSelection();
                                }
                            }}
                        >
                            {multiSelectOpen ? "Cancel" : "Screen Applications"}
                        </button>
                    }
                </div>
            </div>
            {
                (applications.length > 0 ||
                    (!showSelectedOnly)) &&
                (() => {
                    const selectedList = applications
                        .filter(applications => selectedApplications.has(applications.id))

                    const tableApplications = showSelectedOnly ? selectedList : applications;

                    return <ApplicationTable
                        candidates={tableApplications}
                        selectable={multiSelectOpen}
                        hasMore={hasNextPage}
                        loading={isLoading}
                        backgGroundFetching={isFetching}
                        loadingMore={isFetchingNextPage}
                        onLoadMore={fetchNextPage}
                        screeningId={screening_id}
                    />
                }

                )()
            }


            {/* Skeleton placeholder for the info sheet while data is loading.
                The real InfoSheet mounts inside the application row, so it doesn't
                exist until candidate data arrives. This fills the 600px gap. */}
            {(isLoading || applications.length === 0) && !!search.appId && (
                <InfoSheetSkeleton />
            )}


            {/* Screen action bar — sticky bottom, only in Screen mode */}
            <ApplicationMultiSelectToolBar
                onTabChange={onTabChange}
                isMultiSelectMode={multiSelectOpen}
                analysisOpen={infoOpen}
                setIsMultiSelectMode={setMultiSelectOpen}
                type={search.appType}
            />

        </div>
    );
}


interface ApplicationsProps {
    onTabChange?: (tab: "Applications" | "Screening") => void;
    sourceMode: boolean;
    setSourceMode: (mode: boolean) => void;
}


export default function Applications({ onTabChange, sourceMode, setSourceMode }: ApplicationsProps) {
    const { id: screening_id } = useParams({ strict: false }) as { id: string; };
    return (
        <SelectedApplicationsProvider screening_id={screening_id} >
            <ApplicationPage screening_id={screening_id} onTabChange={onTabChange} multiSelectOpen={sourceMode} setMultiSelectOpen={setSourceMode} />
        </SelectedApplicationsProvider>
    );
}