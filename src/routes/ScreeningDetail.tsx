import { useState, useRef, useEffect } from "react";
import { Link, useParams, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getScreening, getResults, getBatchProgress, exportResults,
  uploadResumesToJob, addResumesToJob, rescoreScreening,
  getResumeDetail, getResumePdfUrl,
} from "@/lib/api";
import type { ScreeningListItem } from "@/types";
import { formatDate, truncate } from "@/lib/utils";
import type { RankedCandidate, RubricCategory } from "@/types";
import { TIERS, getTier, TierSection, type TierId } from "@/components/screening/TierSection";
import { useAnalysisSheetOpen, ANALYSIS_SHEET_WIDTH } from "@/components/screening/AnalysisSheet";
import { ProcessingAccordion } from "@/components/screening/ProcessingAccordion";
import { RubricModal } from "@/components/screening/RubricModal";
import { FailedView } from "@/components/screening/FailedView";
import { Pagination } from "@/components/screening/Pagination";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function ScreeningDetail() {
  const { id } = useParams({ strict: false }) as { id: string };
  const search = useSearch({ strict: false }) as { rescore?: number };
  const queryClient = useQueryClient();

  const navigate = useNavigate();
  const [rescoring, setRescoring] = useState(false);
  const [rescoreError, setRescoreError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [collapsedTiers, setCollapsedTiers] = useState<Set<TierId>>(new Set(["poor"]));
  const [showRubric, setShowRubric] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const analysisOpen = useAnalysisSheetOpen();

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

  // Results endpoint returns [] for draft / no-scored-yet — safe to fire
  // unconditionally. Removing the gate fires this in parallel with the
  // screening query for the common (non-draft) path.
  const { data: candidates = [] } = useQuery({
    queryKey: ["results", id],
    queryFn: () => getResults(id),
    refetchInterval: () => {
      if (batchDone) return false;
      return 4000;
    },
  });

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

  // Trigger rescore when navigated here from EditRubric (?rescore=1).
  // Runs once per arrival — we strip the search param immediately so a refresh
  // won't re-fire it, and the local `rescoring` guard prevents double-fire
  // during the same mount.
  useEffect(() => {
    if (search.rescore !== 1 || rescoring) return;
    setRescoring(true);
    setRescoreError(null);

    // Optimistically flip status so ProcessingAccordion renders immediately,
    // before the rescore POST resolves.
    queryClient.setQueryData(
      ["screening", id],
      (old: typeof screening) =>
        old ? { ...old, status: "processing" as const, scored_resumes: 0 } : old,
    );
    queryClient.removeQueries({ queryKey: ["batch-progress", id] });

    navigate({
      to: "/screenings/$id",
      params: { id },
      search: { rescore: undefined },
      replace: true,
    });

    rescoreScreening(id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["batch-progress", id] });
        queryClient.invalidateQueries({ queryKey: ["results", id] });
        queryClient.invalidateQueries({ queryKey: ["screening", id] });
        queryClient.invalidateQueries({ queryKey: ["screenings"] });
      })
      .catch((err) => {
        setRescoreError(err instanceof Error ? err.message : "Failed to start rescore");
        queryClient.invalidateQueries({ queryKey: ["screening", id] });
      })
      .finally(() => setRescoring(false));
  }, [search.rescore, id, queryClient, navigate, rescoring]);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportResults(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${screening?.title ?? "results"}.csv`;
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
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally { setUploading(false); setUploadStep(0); }
  }

  async function handleUploadMore() {
    if (uploadMoreFiles.length === 0) return;
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
      setUploadError(err instanceof Error ? err.message : "Upload failed");
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

  function toggleTier(tierId: TierId) {
    setCollapsedTiers((prev) => {
      const next = new Set(prev);
      next.has(tierId) ? next.delete(tierId) : next.add(tierId);
      return next;
    });
  }

  function openCandidate(c: RankedCandidate) {
    navigate({ to: "/screenings/$id/$resumeId", params: { id, resumeId: c.resume_id } });
  }

  // Hover-prefetch the resume detail + signed PDF URL so click → navigation
  // is on warm cache. Mirrors the screening-row prefetch on the Screenings
  // list page. Idempotent: prefetchQuery is a no-op if data is fresh.
  function prefetchCandidate(c: RankedCandidate) {
    queryClient.prefetchQuery({
      queryKey: ["resume-detail", id, c.resume_id],
      queryFn: () => getResumeDetail(id, c.resume_id),
    });
    queryClient.prefetchQuery({
      queryKey: ["resume-pdf", id, c.resume_id],
      queryFn: () => getResumePdfUrl(id, c.resume_id),
    });
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

  const PAGE_SIZE = 100;
  const totalPages = Math.max(1, Math.ceil(candidates.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedCandidates = candidates.length > PAGE_SIZE
    ? candidates.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    : candidates;
  const showPagination = candidates.length > PAGE_SIZE;

  // Tier counts use the full result set (so pill counts stay stable across pages);
  // the rendered tier rows use the current page slice.
  const tierGroupsAll = TIERS.map((tier) => ({
    tier,
    candidates: candidates.filter((c) => getTier(c.overall_score).id === tier.id),
  }));
  const tierGroups = TIERS.map((tier) => ({
    tier,
    candidates: pagedCandidates.filter((c) => getTier(c.overall_score).id === tier.id),
  }));

  return (
    <div
      className="flex flex-col transition-[margin] duration-200 ease-out"
      style={{ marginRight: analysisOpen ? ANALYSIS_SHEET_WIDTH : 0 }}
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
              {isProcessing && candidates.length > 0
                ? `${candidates.length} scored so far · Ranking finalizes when all complete`
                : candidates.length > 0
                ? showPagination
                  ? `Grouped by fit · ${candidates.length} candidates · Page ${safePage} of ${totalPages}`
                  : `Grouped by fit · ${candidates.length} candidates`
                : `${screening.total_resumes} resumes · Created ${formatDate(screening.created_at)}`}
            </p>
          </div>
          {candidates.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowRubric(true)}
                  className={`h-9 ${analysisOpen ? "px-2.5" : "px-4"} border border-[#D4D4D4] text-xs xl:text-sm font-medium text-[#404040] rounded-xl hover:bg-white transition-colors flex items-center gap-2 whitespace-nowrap`}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="2" width="11" height="10" rx="1.5"/><path d="M4.5 5h5M4.5 7.5h3"/></svg>
                  {!analysisOpen && "Rubric"}
                </button>
              </TooltipTrigger>
              {analysisOpen && <TooltipContent><p className="text-xs">Rubric</p></TooltipContent>}
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { setShowUploadMore((v) => !v); setUploadMoreFiles([]); setUploadError(null); }}
                  className={`h-9 ${analysisOpen ? "px-2.5" : "px-4"} border text-sm font-medium rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap ${showUploadMore ? "border-[#0F0F0F] bg-[#0F0F0F] text-white" : "border-[#D4D4D4] text-[#404040] hover:bg-white"}`}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 2v8M3.5 5.5l3.5-3.5 3.5 3.5"/><path d="M2 12h10"/></svg>
                  {!analysisOpen && "Add resumes"}
                </button>
              </TooltipTrigger>
              {analysisOpen && <TooltipContent><p className="text-xs">Add resumes</p></TooltipContent>}
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleExport}
                  disabled={exporting}
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

        {/* Tier pills */}
        {candidates.length > 0 && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {tierGroupsAll.map(({ tier, candidates: tc }) => (
              <button
                key={tier.id}
                onClick={() => toggleTier(tier.id as TierId)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border bg-white border-[#E8E5DF] text-sm font-medium text-[#0F0F0F] hover:bg-[#F5F3EE] transition-colors ${tc.length === 0 ? "opacity-40 cursor-default" : ""}`}
                disabled={tc.length === 0}
              >
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tier.dot }} />
                {tier.label}
                <span className="text-[#737373] font-normal">{tc.length}</span>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                  className={`text-[#A0A0A0] transition-transform ${collapsedTiers.has(tier.id as TierId) ? "" : "rotate-180"}`}>
                  <path d="M2 4l3.5 3.5L9 4" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 flex flex-col px-4 pb-6 sm:px-6 md:px-8 md:pb-8 gap-4">
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
                          {done && <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l3 3 7-7"/></svg>}
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
                              <path d="M4 19h14M4 3h9l5 5v11"/><path d="M13 3v6h6"/>
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
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8"/></svg>
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
                    className={`hidden md:block border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                      dragActive ? "border-[#C85A17] bg-[#C85A1708]" : "border-[#D4D4D4] hover:border-[#A0A0A0] hover:bg-[#F5F3EE]"
                    }`}
                  >
                    <div className="h-12 w-12 rounded-full bg-[#F5F3EE] border border-[#D4D4D4] flex items-center justify-center mx-auto mb-3">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v10M6 7l4-4 4 4"/><path d="M3 15h14"/></svg>
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
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v10M6 7l4-4 4 4"/><path d="M3 15h14"/></svg>
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
                                <path d="M4 18h12M4 2h8l4 4v12"/><path d="M12 2v5h5"/>
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
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8"/></svg>
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
                      className={`hidden md:block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                        uploadMoreDragActive ? "border-[#C85A17] bg-[#C85A1708]" : "border-[#D4D4D4] hover:border-[#A0A0A0] hover:bg-[#F5F3EE]"
                      }`}
                    >
                      <div className="h-10 w-10 rounded-full bg-[#F5F3EE] border border-[#D4D4D4] flex items-center justify-center mx-auto mb-3">
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v10M6 7l4-4 4 4"/><path d="M3 15h14"/></svg>
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
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v10M6 7l4-4 4 4"/><path d="M3 15h14"/></svg>
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
                disabled={uploadMoreFiles.length === 0 || uploading}
                className="mt-4 w-full h-10 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {uploading && <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                {uploading ? "Uploading & scoring…" : "Add & re-rank"}
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

          {/* Tiered results — visible during processing too (no rank yet) */}
          {candidates.length > 0 && tierGroups.map(({ tier, candidates: tc }) => {
            if (tc.length === 0) return null;
            const collapsed = collapsedTiers.has(tier.id as TierId);
            return (
              <TierSection
                key={tier.id}
                tier={tier}
                candidates={tc}
                collapsed={collapsed}
                onToggle={() => toggleTier(tier.id as TierId)}
                categories={rubricCategories}
                onSelect={openCandidate}
                onPrefetch={prefetchCandidate}
              />
            );
          })}

          {/* Pagination — appears when there are more than 100 candidates */}
          {showPagination && (
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              total={candidates.length}
              pageSize={PAGE_SIZE}
              onChange={(p) => {
                setCurrentPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}

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
      </div>
    </div>
  );
}
