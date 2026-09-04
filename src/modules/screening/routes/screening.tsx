import { BackLink } from "@/components/layout/BackLink";
import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate, useSearch } from "@tanstack/react-router";
// import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useScreeningQuery } from "@/modules/screening/hooks/screening/queries/screening.query"
import { getScreeningUsage } from "@/lib/api";

import type { RubricCategory } from "@/types";
import { formatDate, truncate } from "@/lib/utils";
import { RubricModal } from "@/components/screening/RubricModal";
import { ActionButton } from "@/modules/screening/components/shared/ActionButton";
import { toast } from "sonner";
import {
    FileText,
    NotebookPen,
    Link as Link2,
    Upload,
    RotateCcw,
    Mic,
    History,
    Download
} from "lucide-react";

import Applications from "@/modules/screening/tabs/applications"
import Screening from "@/modules/screening/tabs/screeningTab"
import UploadResumes from "@/modules/screening/components/uploadResumes"
import { useScreeningDetailsNavigation } from "@/modules/screening/hooks/shared/useScreeningDetailNavigation";
import { useAuth } from "@/hooks/useAuth";
import { useAccount } from "@/hooks/useAccount";

import { useScreening } from "@/modules/screening/hooks/shared/useScreening"
import { useApplicationQuery } from "@/modules/screening/hooks/application/custom/useApplicationQuery";

import ScreeningSkeleton from "@/modules/screening/components/skeletons/ScreeningSkeleton"



export const sectionTabs = ["Applications", "Screening"] as const;

export type Sections = typeof sectionTabs[number];



export default function ScreeningDetail() {
    const { id } = useParams({ strict: false }) as { id: string };

    const { search, navigate, setTab,getScreeningSearchParams } = useScreeningDetailsNavigation();

    const currentTab: Sections = search.tab ?? "Applications";



    const { user } = useAuth();
    const { canWrite } = useAccount();


    const [sourceMode, setSourceMode] = useState(false);
    const [showRubric, setShowRubric] = useState(false);




    const analysisOpen = (search.screenId != null && search.tab == "Screening") || (search.appId != null && search.tab === "Applications");

    // Rescore selection mode — flipped on by the Rescore button in the action
    // row. `selectedIds` is the cross-page basket; pagination / search / filter
    // changes only swap the visible rows, never the selection.
    const [rescoreMode, setRescoreMode] = useState(false);


    const [showUploadMore, setShowUploadMore] = useState(false);

    const { screening, isPending: isLoading, error, postJob, viewJD, exporting, handleExport } = useScreening(id);

    // Applications are required by this page, so fetch them at page level
    // and provide the data to the applications table.
    const ApplicationQuery = useApplicationQuery(id, { limit: 30 });

    // Per-job counters (e.g. resumes screened, voice calls made). Shown for
    // every account, not just unlimited ones — these are counts, not limits.
    const { data: screeningUsage = [] } = useQuery({
        queryKey: ["screening-usage", id],
        queryFn: () => getScreeningUsage(id),
        enabled: !!id,
        staleTime: 30_000,
    });


    const toastShownRef = useRef(false);

    useEffect(() => {
        if (search.saved !== 1) {
            toastShownRef.current = false;
            return;
        }
        if (toastShownRef.current) return;
        toastShownRef.current = true;
        toast.success("Rubric saved", { duration: 3500 });
        setRescoreMode(true);
        const { saved: _saved, ...rest } = search;
        navigate({
            to: "/screenings/$id",
            params: { id },
            search: rest as never,
            replace: true,
        });
    }, [search, id, navigate]);

    const totalCandidates = screening?.screened_cnt ?? 0;
    const totalApplications = (screening?.parsed_cnt ?? 0) + (screening?.screened_cnt ?? 0);
    const hasAnyCandidates = totalCandidates > 0;





    const changeTab = useCallback((tab: Sections) => {
        setTab(tab);
    }, [navigate, id]);



    // Cold-cache first paint: render a lightweight skeleton instead of a
    // full-page spinner. The same screening fetch is in flight in the
    // background — when it lands, the full UI swaps in.
    if ((isLoading && !screening)) {
        // console.log("Rendering skeleton for screening detail page", { id });
        return (
            <ScreeningSkeleton />
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


    const rubricCategories: RubricCategory[] = (screening.rubric as any)?.categories ?? [];

    // Backend's `total` is authoritative for pagination. Fall back to the
    // screening's scored count while the first page is still loading, so the
    // page UI doesn't flash empty before the response lands.
    // const totalCandidates = serverTotal || screening.scored_resumes || screening.total_resumes || candidates.length;
    // const hasAnyCandidates = candidates.length > 0 || totalCandidates > 0;
    // // The current page has no rows, but filters are active and the screening
    // // does have scored candidates — i.e. the filters just matched nothing. Keep
    // // the action buttons visible (so the toolbar stays put) but disable the ones
    // // that operate on visible rows.
    // const filtersMatchedNothing =
    //     candidates.length === 0 && hasActiveFilters(queryState) && screening.scored_resumes > 0;

    return (

        <div
            // On md+, push the page content left to make room for the open
            // analysis sheet (600 px). On mobile the sheet overlays full-screen
            // (see AnalysisSheet) so no shift is needed — pushing 600 px on a
            // 320 px viewport would hide the page entirely.
            className={`flex flex-col transition-[margin] duration-200 ease-out ${analysisOpen ? "md:mr-150" : ""}`}
        >
            {/* Header */}
            <div className="px-4 pt-6 pb-4 sm:px-6 sm:pt-8 md:px-8 shrink-0">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4 mb-1">
                    <div>
                        {/* A job page is reached from the dashboard, the jobs list and
                            deep links, so "back" points at the jobs list rather than at
                            browser history. */}
                        <BackLink to="/screenings" label="jobs" className="mb-1" />
                        <div className="flex items-center gap-2 mb-2 text-xs">
                            <Link to="/screenings" className="text-[#737373] hover:text-[#0F0F0F]">Screenings</Link>
                            <span className="text-[#D4D4D4]">/</span>
                            <span className="text-[#404040]">{truncate(screening.title, 40)}</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-[#0F0F0F]">{screening.title}</h1>
                        <p className="text-sm text-[#737373] mt-0.5">
                            {totalApplications} resumes · Created {formatDate(screening.created_at)}
                        </p>
                        {screeningUsage.length > 0 && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                {screeningUsage.map((counter) => (
                                    <span key={counter.key} className="text-xs text-[#737373]">
                                        {counter.label}: <span className="font-medium text-[#404040]">{counter.value}</span>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {screening.jd_url &&
                            <ActionButton title="Job Desc." description="Job Desc." icon={<FileText size={12} />} compacted={analysisOpen} disabled={!screening} onClick={() => viewJD()} />
                        }
                        <ActionButton title="Rubric"
                            icon={<svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="2" width="11" height="10" rx="1.5" /><path d="M4.5 5h5M4.5 7.5h3" /></svg>} compacted={analysisOpen} disabled={!screening} onClick={() => setShowRubric(true)} />

                        {canWrite && <ActionButton title="Post Job"
                            icon={<Link2 size={12} />} compacted={analysisOpen} disabled={!screening} onClick={() => postJob()} />}





                        {currentTab === "Applications" && canWrite && (
                            <ActionButton
                                title="Add Resumes"
                                icon={<Upload size={12} />}
                                compacted={analysisOpen}
                                onClick={() => { setShowUploadMore((v) => !v) }}
                            />
                        )}
                        {true && (
                            // {(candidates.length > 0 || filtersMatchedNothing) && (
                            <>
                                {/* <SourcingModal screening_id={id} onClose={()=>{}}/> */}

                                {currentTab === "Screening" && (
                                    <>
                                        {/* Rescore button */}
                                       

                                        {/* Voice round button */}
                                        <ActionButton
                                            title="Voice round"
                                            onClick={() => navigate({ to: "/screenings/$id/voice", params: { id } })}
                                            icon={<Mic size={12} />}
                                            compacted={analysisOpen}
                                        />

                                        {/* Call History button */}
                                        <ActionButton
                                            title="View Calls"
                                            onClick={() => navigate({ to: "/screenings/$id/voice/calls", params: { id } })}
                                            icon={<History size={12} />}
                                            compacted={analysisOpen}
                                        />



                                    </>
                                )
                                }

                            </>
                        )}

                    </div>
                </div>

            </div>

            {/* ---------------- Tab Options---------------------- */}
            <div className="flex flex-row w-full px-4 sm:px-6 md:px-8 gap-2">
                {
                    sectionTabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => {
                                changeTab(tab);
                                setShowUploadMore(false);
                            }}
                            className={`px-4 py-2 text-sm font-medium rounded-t-lg focus:outline-none ${currentTab === tab ? "bg-[#0F0F0F] text-white" : "bg-[#E8E5DF] text-[#404040] hover:bg-[#D4D4D4]"}`}
                        >
                            {tab}
                        </button>
                    ))
                }


            </div>

            {/* --------------------- Uploadresume Section -------------------- */}
            {
                showUploadMore &&
                <div className="my-4 flex flex-col px-4 pb-6 sm:px-6 md:px-8 md:pb-8 gap-4">
                    {canWrite && <UploadResumes screening_id={id} user_id={user?.id ?? ""} setShowUploadMore={setShowUploadMore} />}
                </div>
            }

            {/* ----------------------- Tabs ------------------------ */}
            <div className="flex-1 min-h-0 flex flex-col px-4 sm:px-6 md:px-8 gap-4">
                {currentTab === "Applications" && <Applications onTabChange={changeTab} sourceMode={sourceMode} setSourceMode={setSourceMode} />}
                {currentTab === "Screening" && <Screening setCurrentTab={changeTab} setSourceMode={setSourceMode} rescoreMode={rescoreMode} setRescoreMode={setRescoreMode} analysisOpen={analysisOpen} />}
            </div>


            {/* -------------------- Modals -------------------------- */}
            {showRubric && (
                <RubricModal
                    categories={rubricCategories}
                    onClose={() => setShowRubric(false)}
                    onEdit={
                        canWrite
                            ? () => {
                                setShowRubric(false);
                                navigate({ to: "/screenings/$id/rubric", params: { id }, search: (prev) => prev });
                            }
                            : undefined
                    }
                />
            )}

        </div>

    );
}
