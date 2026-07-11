import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import { ApplicationTable } from "@/modules/screening/components/application_table";
import data from "../test_data.json"

import { Application } from "@/modules/screening/types/application.type"
import { useSelectedApplications, SelectedApplicationsProvider } from "@/modules/screening/hooks/useSelectedApplication";
import { useApplicationsQuery, useScreeningApplicationsMutation } from "@/modules/screening/hooks/application.hook";
import { toast } from "sonner";
import ResumeParsingProgress from "../components/Processing/resumeParsingProgress";
import { useGetBatchesQuery } from "@/modules/screening/hooks/batch.hook";

const PAGE_SIZE = 10;

export function ApplicationPage({ screening_id, onTabChange }: { screening_id: string; onTabChange?: (tab: "Applications" | "Screening") => void }) {

    const [page, setPage] = useState<number>(1);

    const { data, isLoading: isFetchingApplication, isError, error } = useApplicationsQuery({ screening_id, page: page, pageSize: PAGE_SIZE });
    const { data: active_batches } = useGetBatchesQuery(screening_id);


    const { selectedApplications, clearSelection } = useSelectedApplications(); // Custom hook to manage selected applications state
    const { mutateAsync: screenResumesMutate, isPending: isScreening } = useScreeningApplicationsMutation();




    const [sourceMode, setSourceMode] = useState(false);
    const [showSelectedOnly, setShowSelectedOnly] = useState(false);
    const [Screening, setScreening] = useState(false);
    const [sourceError, setSourceError] = useState<string | null>(null);



    if (isFetchingApplication) {
        return <div>Loading...</div>;
    }

    if (isError) {
        return <div>{error.message}</div>;
    }

    if (!data) {
        return <div>No data available</div>;
    }

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

    function onPageChange(newPage: number) {
        setPage(newPage);
        const startIndex = (newPage - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
    }



    const { applications: candidates, total } = data;


    return (
        <div >
            <div className="my-4 space-y-3">
                { active_batches?.parsing_batch_ids?.map((batch_id) => (
                    <ResumeParsingProgress key={`parsing-${batch_id}`} screening_id={screening_id} batch_id={batch_id} />
                ))}
            </div>

            <div className="flex items-center justify-between">

                <div className="flex w-full justify-end items-center">
                    <button
                        className="my-2 px-3 py-1 rounded-lg bg-[#0F0F0F] text-white text-sm font-medium cursor-pointer"
                        onClick={() => setSourceMode(!sourceMode)}
                    >
                        {sourceMode ? "Cancel" : "Screen Applications"}
                    </button>
                </div>
            </div>

            <ApplicationTable
                candidates={candidates}
                selectable={sourceMode}
                total={total}
                totalPages={Math.ceil(total / Number(PAGE_SIZE))}
                pageSize={PAGE_SIZE}
                page={page}
                showSelectedOnly={showSelectedOnly}
                onPageChange={onPageChange}

            />

            {/* Screen mode hint bar */}
            {sourceMode && candidates.length > 0 && (
                <p className="text-[11px] text-[#737373] -mt-2">
                    <span className="font-medium text-[#404040]">Screen mode</span> · Click rows or checkboxes to select · Shift+Click for range · Ctrl/Cmd+A selects current page · Esc to exit
                </p>
            )}

            {/* Screen action bar — sticky bottom, only in Screen mode */}
            {sourceMode && (() => {
                const totalSelected = selectedApplications.size;
                const onPageCount = candidates.filter(candidate => selectedApplications.has(candidate.id)).length;
                return (
                    <div
                        className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#E8E5DF] bg-white/95 backdrop-blur px-6 py-3 flex items-center justify-between gap-4 transition-[padding] duration-200 ease-out"

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
}


export default function Applications({ onTabChange }: ApplicationsProps) {
    const { id: screening_id } = useParams({ strict: false }) as { id: string; };
    return (
        <SelectedApplicationsProvider screening_id={screening_id}>
            <ApplicationPage screening_id={screening_id} onTabChange={onTabChange} />
        </SelectedApplicationsProvider>
    );
}