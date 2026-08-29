import { useState, useEffect } from "react";
import { useSearch } from "@tanstack/react-router";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import { ApplicationTable } from "@/modules/screening/components/Application/application_table";
import { CustomMenuButton } from "@/modules/screening/components/shared/MenuButton";
import { useSelectedApplications, SelectedApplicationsProvider } from "@/modules/screening/hooks/application/custom/useSelectedApplication";
import {  useScreeningApplicationsMutation } from "@/modules/screening/hooks/application/queries/application.hook";
import { toast } from "sonner";
import ResumeParsingProgress from "@/modules/screening/components/Application/resumeParsingProgress";
import { useGetBatchesQuery } from "@/modules/screening/hooks/shared/batch.hook";
import { ApplicationsToolbar } from "@/modules/screening/components/Application/filters/ApplicationToolbar";
import { useAnalysisSheetOpen as useInfoSheetOpen, ANALYSIS_SHEET_WIDTH } from "@/modules/screening/components/info_sheet";
import { type ScreeningDetailsSearchParams } from "@/modules/screening/types/searchSchema";
import { Archive, CircleCheck } from 'lucide-react'
import { useScreeningDetailsNavigation } from "@/modules/screening/hooks/shared/useScreeningDetailNavigation";
import { useApplicationQuery } from "@/modules/screening/hooks/application/custom/useApplicationQuery"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
    sourceMode: boolean;
    setSourceMode: (mode: boolean) => void;
    onTabChange?: (tab: "Applications" | "Screening") => void;

}

export function ApplicationPage({ screening_id, onTabChange, setSourceMode, sourceMode }: ApplicationPageProps) {

    const { search } = useScreeningDetailsNavigation();

    const infoOpen = useInfoSheetOpen();



    const ApplicationQuery = useApplicationQuery(screening_id, { limit: PAGE_SIZE });
    const { query: ApplicationResultsQuery,setType } = ApplicationQuery;
    const { data, isLoading,isFetching, fetchNextPage, isFetchingNextPage, hasNextPage } = ApplicationResultsQuery;

    const { data: active_batches } = useGetBatchesQuery(screening_id);


    const { selectedApplications, clearSelection } = useSelectedApplications(); // Custom hook to manage selected applications state
    const { mutateAsync: screenResumesMutate, isPending: isScreening } = useScreeningApplicationsMutation();




    // const [sourceMode, setSourceMode] = useState(false);
    const [showSelectedOnly, setShowSelectedOnly] = useState(false);
    const [Screening, setScreening] = useState(false);
    const [sourceError, setSourceError] = useState<string | null>(null);







    async function submitScreen() {
        if (selectedApplications.size === 0) {
            setSourceError("No candidates selected for Screening.");
            return;
        }
        setScreening(true);

        try {
            const resume_ids = Array.from(selectedApplications);
            const res = await screenResumesMutate({ screening_id, resume_ids });
            toast.success(res.message || "Candidates scoring batch started successfully.");
            exitSourceMode();
            onTabChange?.("Screening");
        }
        catch (error) {
            setSourceError("Error Screening candidates. Please try again.");
        }

        setScreening(false);

    }

    function exitSourceMode() {
        setSourceMode(false);
        setShowSelectedOnly(false);
        setSourceError(null);
        clearSelection();
    }


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
                    <CustomMenuButton selectedOption={search.appType} options={options} handleOptionClick={(e:TableOptions)=>setType(e as ScreeningDetailsSearchParams["appType"])} />
                    <button
                        className="my-2 px-3 py-1 rounded-lg bg-[#0F0F0F] text-white text-sm font-medium cursor-pointer"
                        disabled={applications.length === 0 || search.appType != "Active"} // Disable if no applications or not on "Active" tab
                        onClick={() => {
                            if (!applications || applications.length === 0) {
                                toast.error("No candidates available for Screening.");
                                return;
                            }

                            if (!sourceMode) {
                                setSourceMode(true);
                            } else {
                                exitSourceMode();
                            }
                        }}
                    >
                        {sourceMode ? "Cancel" : "Screen Applications"}
                    </button>
                </div>
            </div>

            <ApplicationTable
                candidates={applications}
                selectable={sourceMode}
                hasMore={hasNextPage}
                loading={isLoading}
                backgGroundFetching={isFetching}
                loadingMore={isFetchingNextPage}
                onLoadMore={fetchNextPage}
                screeningId={screening_id}
            />

            {/* Skeleton placeholder for the info sheet while data is loading.
                The real InfoSheet mounts inside the application row, so it doesn't
                exist until candidate data arrives. This fills the 600px gap. */}
            {(isLoading || applications.length === 0) && !!search.appId && (
                <Sheet open={true} modal={false}>
                    <SheetContent
                        showOverlay={false}
                        className="!w-full sm:!max-w-[600px] overflow-y-auto p-0 !z-40"
                    >
                        {/* Sheet header skeleton */}
                        <SheetHeader className="px-6 pt-6 pb-3 border-b border-[#E8E5DF]">
                            <SheetTitle className="text-sm font-semibold text-[#0F0F0F]">
                                <div className="flex items-center justify-between gap-3 mt-4">
                                    <div className="h-4 w-28 rounded bg-[#E8E5DF] animate-pulse" />
                                </div>
                            </SheetTitle>
                        </SheetHeader>
                        {/* Sheet body skeleton */}
                        <div className="px-6 py-6 space-y-5">
                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-full bg-[#E8E5DF] animate-pulse shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-5 w-40 rounded bg-[#E8E5DF] animate-pulse" />
                                    <div className="h-4 w-32 rounded bg-[#F0EDE8] animate-pulse" />
                                    <div className="flex gap-2 mt-1">
                                        <div className="h-6 w-20 rounded-lg bg-[#F5F3EE] animate-pulse" />
                                        <div className="h-6 w-24 rounded-lg bg-[#F5F3EE] animate-pulse" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3 pt-2">
                                <div className="h-16 w-full rounded-xl bg-[#F5F3EE] animate-pulse" />
                                <div className="h-16 w-full rounded-xl bg-[#F5F3EE] animate-pulse" />
                                <div className="h-24 w-full rounded-xl bg-[#F5F3EE] animate-pulse" />
                                <div className="h-24 w-full rounded-xl bg-[#F5F3EE] animate-pulse" />
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            )}


            {/* Screen action bar — sticky bottom, only in Screen mode */}
            {sourceMode && (() => {
                const totalSelected = selectedApplications.size;
                const onPageCount = applications.filter(candidate => selectedApplications.has(candidate.id)).length;
                return (
                    <div
                        className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#E8E5DF] bg-white/95 backdrop-blur px-6 py-3 flex items-center justify-between gap-4 transition-[padding] duration-200 ease-out"
                        style={{ paddingRight: infoOpen ? ANALYSIS_SHEET_WIDTH + 24 : 24 }}
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
                            {/* <label className={`flex items-center gap-2 text-xs ${totalSelected === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} text-[#404040]`}>
                                <input
                                    type="checkbox"
                                    checked={showSelectedOnly}
                                    disabled={totalSelected === 0}
                                    onChange={(e) => setShowSelectedOnly(e.target.checked)}
                                    className="h-3.5 w-3.5 accent-[#C85A17]"
                                />
                                Show selected only
                            </label> */}
                            {sourceError && (
                                <span className="text-xs text-red-600">{sourceError}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={exitSourceMode}
                                disabled={Screening}
                                className="h-9 px-4 text-sm font-medium text-[#404040] border border-[#D4D4D4] rounded-xl hover:bg-[#F5F3EE] disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={clearSelection}
                                disabled={totalSelected === 0 || Screening}
                                className="h-9 px-4 text-sm font-medium text-[#404040] border border-[#D4D4D4] rounded-xl hover:bg-[#F5F3EE] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Clear all
                            </button>
                            <button
                                onClick={submitScreen}
                                disabled={totalSelected === 0 || Screening}
                                className="h-9 px-4 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {Screening && <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                                {Screening ? "Starting…" : `Screen ${totalSelected} candidate${totalSelected === 1 ? "" : "s"}`}
                            </button>
                        </div>
                    </div>
                );
            })()}
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
            <ApplicationPage screening_id={screening_id} onTabChange={onTabChange} sourceMode={sourceMode} setSourceMode={setSourceMode} />
        </SelectedApplicationsProvider>
    );
}