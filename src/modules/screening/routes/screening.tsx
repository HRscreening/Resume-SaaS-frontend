import { useState, useRef, useEffect,useCallback } from "react";
import { Link, useParams, useNavigate, useSearch } from "@tanstack/react-router";
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useScreeningQuery } from "@/modules/screening/hooks/screening/screening.query"
import { getScreening, exportResults } from "@/lib/api";
import { useCandidateQuery } from "@/controllers/screening/useCandidateQuery";
import type { RankedCandidate, RubricCategory } from "@/types";
import { formatDate, truncate } from "@/lib/utils";
import { useAnalysisSheetOpen, setOpenAnalysisSheet } from "@/modules/screening/components/Screening/AnalysisSheet";
import { RubricModal } from "@/components/screening/RubricModal";
import { hasActiveFilters } from "@/components/screening/filters/queryEncoding";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ActionButton from "@/modules/screening/components/shared/ActionButton";
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

import { useAuth } from "@/hooks/useAuth";
import { setOpenAnalysisSheet as setOpenInfoSheet, useAnalysisSheetOpen as useInfoSheetOpen } from "@/modules/screening/components/info_sheet";
import { jdStorageService } from "@/lib/services/index"

import SearchSchema from "@/modules/screening/types/searchSchema";

const HOME_PAGE_URL = import.meta.env.VITE_HOME_PAGE_URL || "https://hiresort.ai";


export const sectionTabs = ["Applications", "Screening"] as const;

export type Sections = typeof sectionTabs[number];



export default function ScreeningDetail() {
    const { id } = useParams({ strict: false }) as { id: string };
    const search = useSearch({ strict: false }) as SearchSchema;

    const currentTab: Sections = search.tab ?? "Applications";

    const navigate = useNavigate({ from: "/screenings/$id", });

    const { user } = useAuth();

    const [exporting, setExporting] = useState(false);
    const [sourceMode, setSourceMode] = useState(false);
    const [showRubric, setShowRubric] = useState(false);

    useEffect(() => {
        setOpenAnalysisSheet(null);
        setOpenInfoSheet(null);
    }, [])

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
        const { saved: _saved, ...rest } = search as SearchSchema;
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

            if (!url) {
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

    const postJob = () => {
        const postedJobUrl = `${HOME_PAGE_URL}/careers/${id}`;

        // Copy the URL to the clipboard
        navigator.clipboard.writeText(postedJobUrl).then(() => {
            toast.success("JobPost URL copied to clipboard.Redirecting...");
            setTimeout(() => {
                window.open(postedJobUrl, "_blank");
            }, 1000);
        }).catch((err) => {
            console.error("Failed to copy URL to clipboard:", err);
            toast.error("Something went wrong, Contact support");
        }
        );

    }

    const changeTab = useCallback((tab:Sections) => {
        // setSearchInput("");

        navigate({
            to: "/screenings/$id",
            params: { id:id},
            search: (prev) => ({
                tab: tab,
                saved: prev.saved,
            }) as never,
            replace: true,
        });
    }, [navigate, id]);

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
                        {screening.jd_url &&
                            <ActionButton title="Job Desc." description="Job Desc." icon={<FileText size={12} />} compacted={analysisOpen} disabled={!screening} onClick={() => viewJD()} />
                        }
                        <ActionButton title="Rubric"
                            icon={<svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="2" width="11" height="10" rx="1.5" /><path d="M4.5 5h5M4.5 7.5h3" /></svg>} compacted={analysisOpen} disabled={!screening} onClick={() => setShowRubric(true)} />

                        <ActionButton title="Post Job"
                            icon={<Link2 size={12} />} compacted={analysisOpen} disabled={!screening} onClick={() => postJob()} />





                        {currentTab === "Applications" && (
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
                                        <ActionButton
                                            title="Rescore"
                                            onClick={() => setRescoreMode(true)}
                                            disabled={isProcessing || rescoreMode || !hasAnyCandidates}
                                            icon={<RotateCcw size={12} />}
                                            compacted={analysisOpen}
                                        />


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



                                        {/* Export CSV */}
                                        <ActionButton
                                            title="Export CSV"
                                            description="Export CSV"
                                            icon={<Download size={12} />}
                                            compacted={analysisOpen}
                                            onClick={handleExport}
                                            disabled={exporting}
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
                                setOpenAnalysisSheet(null);
                                setOpenInfoSheet(null);
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
                    <UploadResumes screening_id={id} user_id={user?.id ?? ""} setShowUploadMore={setShowUploadMore} />
                </div>
            }

            {/* ----------------------- Tabs ------------------------ */}
            <div className="flex-1 min-h-0 flex flex-col px-4 pb-6 sm:px-6 md:px-8 md:pb-8 gap-4">
                {currentTab === "Applications" && <Applications onTabChange={changeTab} sourceMode={sourceMode} setSourceMode={setSourceMode} />}
                {currentTab === "Screening" && <Screening setCurrentTab={changeTab} setSourceMode={setSourceMode} rescoreMode={rescoreMode} setRescoreMode={setRescoreMode} />}
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
                                navigate({ to: "/screenings/$id/rubric", params: { id }, search: (prev) => prev });
                            }
                            : undefined
                    }
                />
            )}

        </div>

    );
}
