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
import { RubricModal } from "@/components/screening/RubricModal";
import { FailedView } from "@/components/screening/FailedView";
import { CandidatesTable } from "@/components/screening/CandidatesTable";
import { hasActiveFilters } from "@/components/screening/filters/queryEncoding";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import Applications from "@/modules/screening/tabs/applications"




import { ResumeUploadService } from "@/lib/services/resumeUpload.service";
import { StorageService } from "@/lib/services/storage.service";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";


import { resumeUploadService } from "@/lib/services";
import {useAddApplicationsMutation} from "@/modules/screening/hooks/application.hook"


type Sections = "Applications" | "Screening"

const sectionTabs: Sections[] = ["Applications", "Screening"];

const PAGE_SIZE = 10;

export default function ScreeningDetail() {
  const { id } = useParams({ strict: false }) as { id: string };
  const search = useSearch({ strict: false }) as { saved?: number } & Record<string, unknown>;
  const queryClient = useQueryClient();

  const [currentTab, setCurrentTab] = useState<Sections>("Applications")

  const navigate = useNavigate();

  const { user } = useAuth();

  const {mutateAsync:UploadResumes,isSuccess:isUploadDone,isPending:isUploading} = useAddApplicationsMutation()

  const [rescoring, setRescoring] = useState(false);
  const [rescoreError, setRescoreError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showRubric, setShowRubric] = useState(false);
  const [showSourcingDetails, setShowSourcingDetails] = useState(false);
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

  const [draftFiles, setDraftFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<0 | 1 | 2>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUploadMore, setShowUploadMore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMoreFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMoreFiles, setUploadMoreFiles] = useState<File[]>([]);
  const [uploadMoreDragActive, setUploadMoreDragActive] = useState(false);
  // Bumped on each successful upload — tells the accordion to auto-expand briefly.
  const [uploadNonce, setUploadNonce] = useState(0);

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
  const { data: progress } = useQuery({
    queryKey: ["batch-progress", id],
    queryFn: () => getBatchProgress(id),
    enabled: !knownIsDraft && (!screening || screening.status !== "draft"),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      return 3000;
    },
  });

  const batchDone = progress?.status === "completed" || progress?.status === "failed";

  // Backend-driven query state (filters, sort, search, pagination) lives in
  // the URL via useCandidateQuery. The hook also owns the results query,
  // so we don't run a separate useQuery here.
  const candidateQuery = useCandidateQuery(id, {
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
    clearAll,
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

  async function handleExport() {
    setExporting(true);
    try {
      const { blob, filename } = await exportResults(id, queryState);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename ?? `${screening?.title ?? "results"}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignored */ } finally { setExporting(false); }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    pickResumeFiles(e.dataTransfer.files, draftFiles, setDraftFiles);
  }

  async function handleUploadAndStart() {
    
    const supabaseClient = createClient();
    const storageService = new StorageService(supabaseClient, "resumes");
    const resumeUploadService = new ResumeUploadService(storageService);

    const result = await resumeUploadService.uploadResumes(draftFiles, id, "user123")

    console.log("Uploaded files:", result);

    return;


    if (draftFiles.length === 0) return;
    const isZipBatch =
      draftFiles.length === 1 &&
      draftFiles[0].name.toLowerCase().endsWith(".zip");
    const payload: File | File[] = isZipBatch ? draftFiles[0] : draftFiles;
    // One key per user-click. Network retries / proxy duplications carry the
    // same key on the wire, so the server replays the cached response instead
    // of double-charging quota or creating two batches.
    const idempotencyKey = crypto.randomUUID();
    setUploading(true);
    setUploadStep(1);
    setUploadError(null);
    const t = setTimeout(() => setUploadStep(2), 1800);
    try {
      const result = await uploadResumesToJob(id, payload, idempotencyKey);
      clearTimeout(t);
      setDraftFiles([]);

      // Immediately mark screening as "processing" in the cache so the UI
      // never flashes back to the draft upload panel. This is not speculative —
      // the backend has already committed the batch and resume rows by the time
      // the 202 response arrives. The subsequent invalidation refetches for
      // accuracy (batch progress, scored counts, etc.) but the status transition
      // is guaranteed at this point.
      queryClient.setQueryData(
        ["screening", id],
        (old: typeof screening) =>
          old ? { ...old, status: "processing" as const, total_resumes: result.total_files } : old,
      );

      queryClient.invalidateQueries({ queryKey: ["screening", id] });
      queryClient.invalidateQueries({ queryKey: ["batch-progress", id] });
      queryClient.invalidateQueries({ queryKey: ["screenings"] });
      queryClient.invalidateQueries({ queryKey: ["usage"] });
      setUploadNonce((n) => n + 1);
    } catch (err) {
      clearTimeout(t);
      // setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally { setUploading(false); setUploadStep(0); }
  }

  async function handleUploadMore() {

    if (uploadMoreFiles.length === 0 || !screening?.id) return;
    

    if (!user){setUploadError("User not authenticated"); return;}

    setUploading(true);
    const result = await resumeUploadService.uploadResumes(uploadMoreFiles, id, user.id)
    console.log("Uploaded files:", result);


    const res = await UploadResumes({resumes:result,screening_id:screening.id})
    console.log(`Response on uploading ${res}`)

    if(isUploadDone) {
      toast.success("Applications Uploaded,Will be Parsed Soon")
    }
    setShowUploadMore(false);
    return;


    const isZipBatch =
      uploadMoreFiles.length === 1 &&
      uploadMoreFiles[0].name.toLowerCase().endsWith(".zip");
    const payload: File | File[] = isZipBatch ? uploadMoreFiles[0] : uploadMoreFiles;
    const idempotencyKey = crypto.randomUUID();
    setUploading(true);
    setUploadError(null);
    try {
      const result = await addResumesToJob(id, payload, idempotencyKey);
      setUploadMoreFiles([]);
      setShowUploadMore(false);

      queryClient.setQueryData(
        ["screening", id],
        (old: typeof screening) =>
          old
            ? { ...old, status: "processing" as const, total_resumes: result.total_resumes }
            : old,
      );

      queryClient.invalidateQueries({ queryKey: ["screening", id] });
      queryClient.invalidateQueries({ queryKey: ["batch-progress", id] });
      queryClient.invalidateQueries({ queryKey: ["results", id] });
      queryClient.invalidateQueries({ queryKey: ["screenings"] });
      queryClient.invalidateQueries({ queryKey: ["usage"] });
      setUploadNonce((n) => n + 1);
    } catch (err) {
      // setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally { setUploading(false); }
  }

  /**
   * Validate and merge a picked FileList into a target file-list state.
   * Used by both the draft-upload and add-more panels — keeps one source of
   * truth for the "single ZIP XOR multiple PDF/DOCX" rule and the de-dupe
   * logic, so the two panels can't drift apart.
   */
  function pickResumeFiles(
    picked: FileList | File[] | null,
    current: File[],
    setter: (files: File[]) => void,
  ): void {
    if (!picked || picked.length === 0) return;
    const arr = Array.from(picked);
    const zips = arr.filter((f) => f.name.toLowerCase().endsWith(".zip"));
    const docs = arr.filter((f) => {
      const n = f.name.toLowerCase();
      return n.endsWith(".pdf") || n.endsWith(".docx");
    });
    if (zips.length > 0 && docs.length > 0) {
      setUploadError("Drop either a single ZIP or one-or-more PDF/DOCX files — not both.");
      return;
    }
    if (zips.length > 1) {
      setUploadError("Only one ZIP archive at a time.");
      return;
    }
    if (zips.length === 1) {
      setUploadError(null);
      setter([zips[0]]);
      return;
    }
    if (docs.length === 0) {
      setUploadError("Unsupported file type. Use ZIP, PDF, or DOCX.");
      return;
    }
    setUploadError(null);
    const seen = new Set(current.map((f) => `${f.name}_${f.size}`));
    const merged = [...current];
    for (const f of docs) {
      const key = `${f.name}_${f.size}`;
      if (!seen.has(key)) {
        merged.push(f);
        seen.add(key);
      }
    }
    setter(merged);
  }

  function acceptUploadMoreFiles(picked: FileList | File[] | null): void {
    pickResumeFiles(picked, uploadMoreFiles, setUploadMoreFiles);
  }

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
              {isProcessing && totalCandidates > 0
                ? `${screening.scored_resumes} scored so far · Ranking finalizes when all complete`
                : hasAnyCandidates
                  ? `${totalCandidates} candidate${totalCandidates === 1 ? "" : "s"} · Ranked by overall score`
                  : `${screening.total_resumes} resumes · Created ${formatDate(screening.created_at)}`}
            </p>
          </div>
          {(candidates.length > 0 || filtersMatchedNothing) && (
            <div className="flex flex-wrap items-center gap-2">
              {/* <SourcingModal screening_id={id} onClose={()=>{}}/> */}
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
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate({ to: "/screenings/$id/voice", params: { id } })}
                  className={`h-9 ${analysisOpen ? "px-2.5" : "px-4"} border border-[#D4D4D4] text-xs xl:text-sm font-medium text-[#404040] rounded-xl hover:bg-white transition-colors flex items-center gap-2 whitespace-nowrap`}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1.5a2 2 0 0 1 2 2v3a2 2 0 1 1-4 0v-3a2 2 0 0 1 2-2z"/><path d="M3 6.5a4 4 0 0 0 8 0M7 10.5v2M5 12.5h4"/></svg>
                  {!analysisOpen && "Voice round"}
                </button>
              </TooltipTrigger>
              {analysisOpen && <TooltipContent><p className="text-xs">Voice round</p></TooltipContent>}
            </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => { setShowUploadMore((v) => !v); setUploadMoreFiles([]); setUploadError(null); }}
                    className={`h-9 ${analysisOpen ? "px-2.5" : "px-4"} border text-sm font-medium rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap ${showUploadMore ? "border-[#0F0F0F] bg-[#0F0F0F] text-white" : "border-[#D4D4D4] text-[#404040] hover:bg-white"}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 2v8M3.5 5.5l3.5-3.5 3.5 3.5" /><path d="M2 12h10" /></svg>
                    {!analysisOpen && "Add resumes"}
                  </button>
                </TooltipTrigger>
                {analysisOpen && <TooltipContent><p className="text-xs">Add resumes</p></TooltipContent>}
              </Tooltip>
              {currentTab === "Screening" &&
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setRescoreMode(true)}
                      disabled={isProcessing || rescoreMode || candidates.length === 0}
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
              }
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleExport}
                    disabled={exporting || candidates.length === 0}
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
            </div>
          )}
        </div>

      </div>
      <div
        className="flex flex-row w-full px-4 pb-6 sm:px-6 md:px-8 md:pb-8 gap-2"
      >
        {
          sectionTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg focus:outline-none ${currentTab === tab ? "bg-[#0F0F0F] text-white" : "bg-[#E8E5DF] text-[#404040] hover:bg-[#D4D4D4]"}`}
            >
              {tab}
            </button>
          ))
        }


      </div>

      <div className="flex-1 min-h-0 flex flex-col px-4 pb-6 sm:px-6 md:px-8 md:pb-8 gap-4">
        
        {
          currentTab === "Applications" && <Applications />
        }

        {/* Content area */

          currentTab === "Screening" &&
          <div className="w-full space-y-4">
            {/* Draft upload */}
            {isDraft && (() => {
              const isZipDraft =
                draftFiles.length === 1 &&
                draftFiles[0].name.toLowerCase().endsWith(".zip");
              return (
                <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5 sm:p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-lg font-semibold text-[#0F0F0F]">Upload resumes</h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F0EDE8] border border-[#D4D4D4] text-xs font-semibold text-[#404040] tracking-wide">.ZIP · .PDF · .DOCX</span>
                  </div>
                  <p className="text-sm text-[#737373] mb-2">
                    Upload a <strong>.zip</strong> archive of resumes, or drop in one-or-more <strong>.pdf</strong> / <strong>.docx</strong> files directly to start screening.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {rubricCategories.map((cat, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-md border border-[#D4D4D4] bg-[#F5F3EE] font-medium text-[#404040]">
                        {cat.name} ({cat.weight}%)
                        {cat.subcategories.length > 0 && (
                          <span className="text-[#A0A0A0] ml-1">· {cat.subcategories.length} sub</span>
                        )}
                      </span>
                    ))}
                  </div>
                  {uploadError && (
                    <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{uploadError}</div>
                  )}

                  <input ref={fileInputRef} type="file" accept=".zip,.pdf,.docx" multiple className="hidden"
                    onChange={(e) => { pickResumeFiles(e.target.files, draftFiles, setDraftFiles); e.target.value = ""; }} />

                  {/* Upload stages — shown while uploading */}
                  {uploading ? (
                    <div className="border border-[#E8E5DF] rounded-2xl p-6 bg-[#FAFAF8]">
                      <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide mb-4">Upload progress</p>
                      {(
                        [
                          {
                            label: isZipDraft ? "Sending ZIP to server" : `Sending ${draftFiles.length} file${draftFiles.length === 1 ? "" : "s"} to server`,
                            detail: isZipDraft ? draftFiles[0]?.name ?? "" : draftFiles.map((f) => f.name).join(", "),
                          },
                          {
                            label: "Extracting & validating files",
                            detail: isZipDraft ? "Checking PDF & DOCX files inside the archive" : "Checking each PDF & DOCX",
                          },
                        ] as const
                      ).map((s, i) => {
                        const done = uploadStep > i + 1;
                        const active = uploadStep === i + 1;
                        return (
                          <div key={i} className={`flex items-start gap-3 mb-3 transition-opacity ${uploadStep < i + 1 ? "opacity-30" : ""}`}>
                            <div className="h-5 w-5 shrink-0 flex items-center justify-center mt-0.5">
                              {done && <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l3 3 7-7" /></svg>}
                              {active && <div className="h-4 w-4 rounded-full border-2 border-[#C85A17] border-t-transparent animate-spin" />}
                              {!done && !active && <div className="h-2 w-2 rounded-full bg-[#D4D4D4] mx-auto" />}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm font-medium ${active ? "text-[#0F0F0F]" : done ? "text-green-700" : "text-[#A0A0A0]"}`}>{s.label}</p>
                              {active && <p className="text-xs text-[#737373] mt-0.5 truncate max-w-xs">{s.detail}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : draftFiles.length > 0 ? (
                    /* File(s) selected — ready to upload */
                    <div className="border border-[#D4D4D4] rounded-2xl p-4 bg-[#FAFAF8]">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-[#404040] uppercase tracking-wide">
                          {isZipDraft ? "ZIP archive selected" : `${draftFiles.length} file${draftFiles.length === 1 ? "" : "s"} selected`}
                        </p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-medium text-[#C85A17] hover:underline"
                        >
                          {isZipDraft ? "Change file" : "Add more"}
                        </button>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-auto">
                        {draftFiles.map((f, idx) => {
                          const ext = f.name.toLowerCase().endsWith(".zip")
                            ? "ZIP"
                            : f.name.toLowerCase().endsWith(".docx")
                              ? "DOCX"
                              : "PDF";
                          return (
                            <div key={`${f.name}_${f.size}_${idx}`} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-[#E8E5DF]">
                              <div className="h-8 w-8 rounded-lg bg-[#F0EDE8] border border-[#D4D4D4] flex items-center justify-center shrink-0">
                                <svg width="14" height="14" viewBox="0 0 22 22" fill="none" stroke="#404040" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M4 19h14M4 3h9l5 5v11" /><path d="M13 3v6h6" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#0F0F0F] truncate">{f.name}</p>
                                <p className="text-xs text-[#737373] mt-0.5">
                                  {f.size > 1024 * 1024
                                    ? `${(f.size / 1024 / 1024).toFixed(1)} MB`
                                    : `${(f.size / 1024).toFixed(0)} KB`} · {ext}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setDraftFiles((prev) => prev.filter((_, i) => i !== idx))}
                                className="h-7 w-7 rounded-lg text-[#A0A0A0] hover:text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0 transition-colors"
                              >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Desktop: drag-drop zone with ZIP/multi-file affordance. */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`hidden md:block border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragActive ? "border-[#C85A17] bg-[#C85A1708]" : "border-[#D4D4D4] hover:border-[#A0A0A0] hover:bg-[#F5F3EE]"
                          }`}
                      >
                        <div className="h-12 w-12 rounded-full bg-[#F5F3EE] border border-[#D4D4D4] flex items-center justify-center mx-auto mb-3">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v10M6 7l4-4 4 4" /><path d="M3 15h14" /></svg>
                        </div>
                        <p className="text-sm font-medium text-[#0F0F0F] mb-1">Drop a ZIP, PDF, or DOCX here</p>
                        <p className="text-xs text-[#737373]">or click to browse — multiple PDF/DOCX files allowed</p>
                        <p className="text-xs font-semibold text-[#A0A0A0] mt-3 uppercase tracking-wide">ZIP · PDF · DOCX</p>
                      </div>

                      {/* Mobile: clean tap-to-pick CTA. Same fileInputRef — the
                      native iOS/Android picker handles file selection. Users
                      can still pick a ZIP from their device if they want,
                      and pickResumeFiles handles it; the helper text below
                      points heavy bulk-upload users to desktop where the
                      drag-drop UX is far better. */}
                      <div className="md:hidden">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full flex flex-col items-center gap-2 p-6 rounded-2xl border-2 border-dashed border-[#D4D4D4] bg-white hover:bg-[#F5F3EE] active:bg-[#EAE7DF] transition-colors"
                        >
                          <div className="h-10 w-10 rounded-full bg-[#F5F3EE] border border-[#D4D4D4] flex items-center justify-center">
                            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v10M6 7l4-4 4 4" /><path d="M3 15h14" /></svg>
                          </div>
                          <span className="text-sm font-semibold text-[#0F0F0F]">Choose a resume</span>
                          <span className="text-xs text-[#737373]">PDF or DOCX</span>
                        </button>
                        <p className="mt-3 text-xs text-[#737373] text-center">
                          Uploading many resumes or a ZIP archive? Open this screen on a desktop browser for the full drag-and-drop flow.
                        </p>
                      </div>
                    </>
                  )}

                  <button
                    onClick={handleUploadAndStart}
                    disabled={draftFiles.length === 0 || uploading}
                    className="mt-6 w-full h-11 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {uploading && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                    {uploading ? "Processing…" : "Start screening"}
                  </button>
                </div>
              );
            })()}

            {/* Add more resumes panel (non-draft screenings) */}
            {!isDraft && showUploadMore && (
              <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-[#0F0F0F]">Add more resumes</h2>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F0EDE8] border border-[#D4D4D4] text-xs font-semibold text-[#404040] tracking-wide">.ZIP · .PDF · .DOCX</span>
                    </div>
                    <p className="text-xs text-[#737373] mt-1">Upload a ZIP archive or one-or-more PDF/DOCX files. New resumes are scored and re-ranked against all existing candidates.</p>
                  </div>
                  <button onClick={() => { setShowUploadMore(false); setUploadMoreFiles([]); setUploadError(null); }}
                    className="h-7 w-7 rounded-lg hover:bg-[#F5F3EE] flex items-center justify-center text-[#737373] shrink-0 ml-4">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
                  </button>
                </div>
                {uploadError && (
                  <div className="mt-3 mb-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{uploadError}</div>
                )}
                <input ref={uploadMoreFileInputRef} type="file" accept=".zip,.pdf,.docx" multiple className="hidden"
                  onChange={(e) => { acceptUploadMoreFiles(e.target.files); e.target.value = ""; }} />
                <div className="mt-4">
                  {uploadMoreFiles.length > 0 ? (
                    <div className="border border-[#D4D4D4] rounded-2xl p-4 bg-[#FAFAF8]">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-[#404040] uppercase tracking-wide">
                          {uploadMoreFiles.length === 1 && uploadMoreFiles[0].name.toLowerCase().endsWith(".zip")
                            ? "ZIP archive selected"
                            : `${uploadMoreFiles.length} file${uploadMoreFiles.length === 1 ? "" : "s"} selected`}
                        </p>
                        <button
                          type="button"
                          onClick={() => uploadMoreFileInputRef.current?.click()}
                          className="text-xs font-medium text-[#C85A17] hover:underline"
                        >
                          Add more
                        </button>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {uploadMoreFiles.map((f, idx) => {
                          const lower = f.name.toLowerCase();
                          const kind = lower.endsWith(".zip") ? "ZIP" : lower.endsWith(".pdf") ? "PDF" : "Word";
                          const sizeStr = f.size > 1024 * 1024
                            ? `${(f.size / 1024 / 1024).toFixed(1)} MB`
                            : `${(f.size / 1024).toFixed(0)} KB`;
                          return (
                            <div key={`${f.name}_${f.size}_${idx}`} className="flex items-center gap-3 bg-white border border-[#E8E5DF] rounded-xl px-3 py-2">
                              <div className="h-8 w-8 rounded-lg bg-[#FBF1E7] flex items-center justify-center shrink-0">
                                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#C85A17" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M4 18h12M4 2h8l4 4v12" /><path d="M12 2v5h5" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#0F0F0F] truncate">{f.name}</p>
                                <p className="text-xs text-[#737373]">{sizeStr} · {kind}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setUploadMoreFiles((prev) => prev.filter((_, i) => i !== idx))}
                                className="h-7 w-7 rounded-lg text-[#A0A0A0] hover:text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0 transition-colors"
                                aria-label={`Remove ${f.name}`}
                              >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Desktop dropzone. */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); setUploadMoreDragActive(true); }}
                        onDragLeave={() => setUploadMoreDragActive(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setUploadMoreDragActive(false);
                          acceptUploadMoreFiles(e.dataTransfer.files);
                        }}
                        onClick={() => uploadMoreFileInputRef.current?.click()}
                        className={`hidden md:block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${uploadMoreDragActive ? "border-[#C85A17] bg-[#C85A1708]" : "border-[#D4D4D4] hover:border-[#A0A0A0] hover:bg-[#F5F3EE]"
                          }`}
                      >
                        <div className="h-10 w-10 rounded-full bg-[#F5F3EE] border border-[#D4D4D4] flex items-center justify-center mx-auto mb-3">
                          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v10M6 7l4-4 4 4" /><path d="M3 15h14" /></svg>
                        </div>
                        <p className="text-sm font-medium text-[#0F0F0F] mb-1">Drop files here</p>
                        <p className="text-xs text-[#737373]">or click to browse</p>
                        <p className="text-xs font-semibold text-[#A0A0A0] mt-2 uppercase tracking-wide">ZIP archive · or one-or-more PDF/DOCX</p>
                      </div>

                      {/* Mobile tap-to-pick. Same uploadMoreFileInputRef. */}
                      <div className="md:hidden">
                        <button
                          type="button"
                          onClick={() => uploadMoreFileInputRef.current?.click()}
                          className="w-full flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-dashed border-[#D4D4D4] bg-white hover:bg-[#F5F3EE] active:bg-[#EAE7DF] transition-colors"
                        >
                          <div className="h-9 w-9 rounded-full bg-[#F5F3EE] border border-[#D4D4D4] flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v10M6 7l4-4 4 4" /><path d="M3 15h14" /></svg>
                          </div>
                          <span className="text-sm font-semibold text-[#0F0F0F]">Add a resume</span>
                          <span className="text-xs text-[#737373]">PDF or DOCX</span>
                        </button>
                        <p className="mt-2 text-xs text-[#737373] text-center">
                          Bulk upload (ZIP, many files) works best on a desktop browser.
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={handleUploadMore}
                  disabled={uploadMoreFiles.length === 0 || uploading || isUploading}
                  className="mt-4 w-full h-10 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {uploading || isUploading && <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                  {uploading || isUploading ? "Uploading & scoring…" : "Add & re-rank"}
                </button>
              </div>
            )}

            {/* Processing accordion — combined banner + per-file drill-down */}
            {isProcessing && (
              <ProcessingAccordion
                progress={progress ?? null}
                totalFiles={screening.total_resumes}
                uploadNonce={uploadNonce}
              />
            )}

            {/* Partial failures */}
            {!isProcessing && progress && (progress.failed_count ?? 0) > 0 && (
              <FailedView progress={progress} hasResults={candidates.length > 0} />
            )}

            {/* Total failure */}
            {screening.status === "failed" && candidates.length === 0 && !(progress && (progress.failed_count ?? 0) > 0) && (
              <div className="bg-red-50 rounded-2xl border border-red-200 p-6 text-center">
                <p className="text-sm font-semibold text-red-800">Screening failed</p>
                <p className="text-xs text-red-600 mt-1">All resumes failed to process. Please check the job description and try again.</p>
              </div>
            )}

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
                    // page={showSelectedOnly ? 1 : currentPage}
                    // pageSize={PAGE_SIZE}
                    // total={tableTotal}
                    // onPageChange={}
                    loading={!showSelectedOnly && pageLoading}
                    
                    // onPrefetchPage={()=>{}}
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

            {/* Rubric modal */}
            {showRubric && (
              <RubricModal
                categories={rubricCategories}
                onClose={() => setShowRubric(false)}
                onEdit={
                  !isProcessing && candidates.length > 0
                    ? () => {
                      setShowRubric(false);
                      navigate({ to: "/screenings/$id/rubric", params: { id } });
                    }
                    : undefined
                }
              />
            )}



          </div>
        }
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
    </div>
  );
}
