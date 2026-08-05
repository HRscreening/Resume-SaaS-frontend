import { useState, useRef, useEffect } from "react";
import { Link, useParams, useNavigate, useSearch } from "@tanstack/react-router";
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useScreeningQuery } from "@/modules/screening/hooks/screening/screening.query"
import { getScreening, exportResults } from "@/lib/api";
import { useCandidateQuery } from "@/controllers/screening/useCandidateQuery";
import type { RankedCandidate, RubricCategory } from "@/types";
import { formatDate, truncate } from "@/lib/utils";
import { useAnalysisSheetOpen, setOpenAnalysisSheet } from "@/components/screening/AnalysisSheet";
import { RubricModal } from "@/components/screening/RubricModal";
import { hasActiveFilters } from "@/components/screening/filters/queryEncoding";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";


import Applications from "@/modules/screening/tabs/applications"
import Screening from "@/modules/screening/tabs/screeningTab"
import UploadResumes from "@/modules/screening/components/uploadResumes"

import { useAuth } from "@/hooks/useAuth";
import { SelectedApplicationsProvider } from "../hooks/useSelectedApplication";
import { setOpenAnalysisSheet as setOpenInfoSheet, useAnalysisSheetOpen as useInfoSheetOpen } from "@/modules/screening/components/info_sheet";
import { jdStorageService } from "@/lib/services/index"



type Sections = "Applications" | "Screening"

const sectionTabs: Sections[] = ["Applications", "Screening"];

const PAGE_SIZE = 10;

export default function ScreeningDetail() {
    const { id } = useParams({ strict: false }) as { id: string };
    const search = useSearch({ strict: false }) as { saved?: number } & Record<string, unknown>;

    const [currentTab, setCurrentTab] = useState<Sections>("Applications")

    const navigate = useNavigate();

    const { user } = useAuth();

    const [exporting, setExporting] = useState(false);
    const [sourceMode, setSourceMode] = useState(false);
    const [showRubric, setShowRubric] = useState(false);
    const screeningAnalysisOpen = useAnalysisSheetOpen();
    const infoSheetOpen = useInfoSheetOpen();
    const analysisOpen = screeningAnalysisOpen || infoSheetOpen;

    // Rescore selection mode — flipped on by the Rescore button in the action
    // row. `selectedIds` is the cross-page basket; pagination / search / filter
    // changes only swap the visible rows, never the selection.
    const [rescoreMode, setRescoreMode] = useState(false);


    const [showUploadMore, setShowUploadMore] = useState(false);
    // Synchronous status hint from the screenings-list cache. Used to gate the
    // batch-progress query on cold cache so we don't fire a request that 404s
    // for a draft screening (no batch row exists yet). On warm cache the hint
    // is reliable; on direct URL paste it's `undefined` and we let the query
    // fire — a 404 for draft is a rare cost.


    const { data: screening, isLoading, error } = useScreeningQuery(id);



    const batchDone = true; // Temporary override for testing without batch-progress API

    // Backend-driven query state (filters, sort, search, pagination) lives in
    // the URL via useCandidateQuery. The hook also owns the results query,
    // so we don't run a separate useQuery here.
    // const candidateQuery = useCandidateQuery(id, {
    //     pageSize: PAGE_SIZE,
    //     pollWhileProcessing: false,
    //     batchDone,
    // });
    // const { state: queryState, query: resultsQuery } = candidateQuery;
    // const resultsPage = resultsQuery.data;
    // const candidates = resultsPage?.items ?? [];
    // const serverTotal = resultsPage?.total ?? 0;



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
        const { saved: _saved, ...rest } = search as Record<string, unknown>;
        navigate({
            to: "/screenings/$id",
            params: { id },
            search: rest as never,
            replace: true,
        });
    }, [search, id, navigate]);

    const totalCandidates = screening?.scored_resumes_cnt ?? 0;
    const totalApplications = (screening?.applications_cnt ?? 0) + (screening?.scored_resumes_cnt ?? 0);
    const hasAnyCandidates = totalCandidates > 0;


    async function viewJD() {
        try {
            const url = screening?.jd_url;

           if(!url){
            toast.error("Job description not available");
            return;
           }
            // const signedUrl = await jdStorageService.createSignedUrl(url, 60 * 5);
            const signedUrl = jdStorageService.getPublicUrl(url);
            window.open(signedUrl, "_blank");
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Failed to view job description"
            );
        }
    }

    async function handleExport() {
        setExporting(true);
        try {
            // const { blob, filename } = await exportResults(id, queryState);
            const { blob, filename } = await exportResults(id, {});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename ?? `${screening?.title ?? "results"}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch { /* ignored */ } finally { setExporting(false); }
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
                        <div className="flex items-center gap-2 mb-2 text-xs">
                            <Link to="/screenings" className="text-[#737373] hover:text-[#0F0F0F]">Screenings</Link>
                            <span className="text-[#D4D4D4]">/</span>
                            <span className="text-[#404040]">{truncate(screening.title, 40)}</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-[#0F0F0F]">{screening.title}</h1>
                        <p className="text-sm text-[#737373] mt-0.5">
                            {totalApplications} resumes · Created {formatDate(screening.created_at)}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    disabled={!screening }
                                    onClick={() => viewJD()}
                                    className={`h-9 ${analysisOpen ? "px-2.5" : "px-4"} border border-[#D4D4D4] text-xs xl:text-sm font-medium text-[#404040] rounded-xl hover:bg-white transition-colors flex items-center gap-2 whitespace-nowrap`}
                                >
                                  
                                        <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        >
                                        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
                                        <path d="M14 2v5h5" />
                                        <path d="M9 13h6" />
                                        <path d="M9 17h4" />
                                    </svg>
                                
                                    {!analysisOpen && "Job Desc."}
                                </button>
                            </TooltipTrigger>
                            {analysisOpen && <TooltipContent><p className="text-xs">Job Desc.</p></TooltipContent>}
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => setShowRubric(true)}
                                    className={`h-9 ${analysisOpen ? "px-2.5" : "px-4"} border border-[#D4D4D4] text-xs xl:text-sm font-medium text-[#404040] rounded-xl hover:bg-white transition-colors flex items-center gap-2 whitespace-nowrap`}
                                >
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="2" width="11" height="10" rx="1.5" /><path d="M4.5 5h5M4.5 7.5h3" /></svg>
                                    {!analysisOpen && "Rubric"}
                                </button>
                            </TooltipTrigger>
                            {analysisOpen && <TooltipContent><p className="text-xs">Rubric</p></TooltipContent>}
                        </Tooltip>

                        {currentTab === "Applications" && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => { setShowUploadMore((v) => !v) }}
                                        className={`h-9 ${analysisOpen ? "px-2.5" : "px-4"} border text-sm font-medium rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap ${showUploadMore ? "border-[#0F0F0F] bg-[#0F0F0F] text-white" : "border-[#D4D4D4] text-[#404040] hover:bg-white"}`}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 2v8M3.5 5.5l3.5-3.5 3.5 3.5" /><path d="M2 12h10" /></svg>
                                        {!analysisOpen && "Add resumes"}
                                    </button>
                                </TooltipTrigger>
                                {analysisOpen && <TooltipContent><p className="text-xs">Add resumes</p></TooltipContent>}
                            </Tooltip>

                        )}
                        {true && (
                            // {(candidates.length > 0 || filtersMatchedNothing) && (
                            <>
                                {/* <SourcingModal screening_id={id} onClose={()=>{}}/> */}

                                {currentTab === "Screening" && (
                                    <>
                                        {/* Rubric button */}

                                        {/* Rescore button */}
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => setRescoreMode(true)}
                                                    disabled={isProcessing || rescoreMode || !hasAnyCandidates}
                                                    // disabled={isProcessing || rescoreMode || candidates.length === 0}
                                                    className={`h-9 ${analysisOpen ? "px-2.5" : "px-4"} border border-[#D4D4D4] text-xs xl:text-sm font-medium text-[#404040] rounded-xl hover:bg-white transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed`}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11.5 4.5A5 5 0 1 0 12 9" /><path d="M11.5 1.5v3h-3" />
                                                    </svg>
                                                    {!analysisOpen && "Rescore"}
                                                </button>
                                            </TooltipTrigger>
                                            {analysisOpen && <TooltipContent><p className="text-xs">Rescore</p></TooltipContent>}
                                        </Tooltip>
                                        {/* Voice round button */}
                                        {/* <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => navigate({ to: "/screenings/$id/voice", params: { id } })}
                                                    className={`h-9 ${analysisOpen ? "px-2.5" : "px-4"} border border-[#D4D4D4] text-xs xl:text-sm font-medium text-[#404040] rounded-xl hover:bg-white transition-colors flex items-center gap-2 whitespace-nowrap`}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1.5a2 2 0 0 1 2 2v3a2 2 0 1 1-4 0v-3a2 2 0 0 1 2-2z" /><path d="M3 6.5a4 4 0 0 0 8 0M7 10.5v2M5 12.5h4" /></svg>
                                                    {!analysisOpen && "Voice round"}
                                                </button>
                                            </TooltipTrigger>
                                            {analysisOpen && <TooltipContent><p className="text-xs">Voice round</p></TooltipContent>}
                                        </Tooltip> */}
                                        {/* Export CSV */}
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={handleExport}
                                                    disabled={exporting}
                                                    // disabled={exporting || candidates.length === 0}
                                                    className={`h-9 ${analysisOpen ? "px-2.5" : "px-4"} border border-[#D4D4D4] text-xs xl:text-sm font-medium text-[#404040] rounded-xl hover:bg-white transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-60`}
                                                >
                                                    {exporting
                                                        ? <span className="h-3.5 w-3.5 rounded-full border-2 border-[#404040] border-t-transparent animate-spin" />
                                                        : <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1.5v8M4 7l3 3 3-3" /><path d="M1.5 10.5v1.5a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5v-1.5" /></svg>
                                                    }
                                                    {!analysisOpen && "Export CSV"}
                                                </button>
                                            </TooltipTrigger>
                                            {analysisOpen && <TooltipContent><p className="text-xs">Export CSV</p></TooltipContent>}
                                        </Tooltip>
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
                            onClick={() => { setCurrentTab(tab); setShowUploadMore(false); setOpenAnalysisSheet(null); setOpenInfoSheet(null); }}
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
                    <UploadResumes screening_id={id} user_id={user?.id ?? ""} setShowUploadMore={setShowUploadMore} />
                </div>
            }

            {/* ----------------------- Tabs ------------------------ */}
            <div className="flex-1 min-h-0 flex flex-col px-4 pb-6 sm:px-6 md:px-8 md:pb-8 gap-4">
                {currentTab === "Applications" && <Applications onTabChange={setCurrentTab} sourceMode={sourceMode} setSourceMode={setSourceMode} />}
                {currentTab === "Screening" && <Screening setCurrentTab={setCurrentTab} setSourceMode={setSourceMode} rescoreMode={rescoreMode} setRescoreMode={setRescoreMode} />}
            </div>


            {/* -------------------- Modals -------------------------- */}
            {showRubric && (
                <RubricModal
                    categories={rubricCategories}
                    onClose={() => setShowRubric(false)}
                    onEdit={
                        // !isProcessing && candidates.length > 0
                        !isProcessing
                            ? () => {
                                setShowRubric(false);
                                navigate({ to: "/screenings/$id/rubric", params: { id } });
                            }
                            : undefined
                    }
                />
            )}

        </div>

    );
}
