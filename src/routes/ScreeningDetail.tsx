import { useState, useRef, useEffect } from "react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getScreening, getResults, getBatchProgress, exportResults,
  uploadResumesToJob, addResumesToJob,
} from "@/lib/api";
import { formatDate, truncate } from "@/lib/utils";
import type { RankedCandidate, BatchProgress, FileProgress, RubricCategory } from "@/types";

// ─── Tier config ─────────────────────────────────────────────────────────────

const TIERS = [
  { id: "strong",    label: "Strong Match", min: 75, dot: "#22C55E" },
  { id: "potential", label: "Potential",    min: 55, dot: "#EAB308" },
  { id: "risky",     label: "Risky",        min: 35, dot: "#F97316" },
  { id: "poor",      label: "Poor Fit",     min: 0,  dot: "#EF4444" },
];

type TierId = "strong" | "potential" | "risky" | "poor";

function getTier(score: number) {
  if (score >= 75) return TIERS[0];
  if (score >= 55) return TIERS[1];
  if (score >= 35) return TIERS[2];
  return TIERS[3];
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScreeningDetail() {
  const { id } = useParams({ strict: false }) as { id: string };
  const queryClient = useQueryClient();

  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [collapsedTiers, setCollapsedTiers] = useState<Set<TierId>>(new Set(["poor"]));
  const [showRubric, setShowRubric] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [zipFile, setZipFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<0 | 1 | 2>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUploadMore, setShowUploadMore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMoreFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMoreFile, setUploadMoreFile] = useState<File | null>(null);
  const [uploadMoreDragActive, setUploadMoreDragActive] = useState(false);

  const { data: screening, isLoading, error } = useQuery({
    queryKey: ["screening", id],
    queryFn: () => getScreening(id),
    refetchInterval: (query) => {
      const s = query.state.data;
      if (!s || ["completed", "failed", "draft"].includes(s.status)) return false;
      return 5000;
    },
  });

  // Fetch batch-progress and results in parallel with screening (no waterfall).
  // Both gracefully handle 404 when the screening is still in draft.
  const { data: progress } = useQuery({
    queryKey: ["batch-progress", id],
    queryFn: () => getBatchProgress(id),
    enabled: !!screening && screening.status !== "draft",
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      return 3000;
    },
  });

  const batchDone = progress?.status === "completed" || progress?.status === "failed";

  const { data: candidates = [] } = useQuery({
    queryKey: ["results", id],
    queryFn: () => getResults(id),
    enabled: !!screening && screening.status !== "draft",
    // Keep polling until the batch is fully done — stop only then so all
    // results (not just the first few that arrived) are fetched.
    refetchInterval: () => {
      if (batchDone) return false;
      return 4000;
    },
  });

  // Instant results fetch when batch completes — no waiting for next poll cycle
  useEffect(() => {
    if (batchDone) {
      queryClient.invalidateQueries({ queryKey: ["results", id] });
      queryClient.invalidateQueries({ queryKey: ["screening", id] });
    }
  }, [batchDone, id, queryClient]);

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
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".zip")) setZipFile(file);
  }

  async function handleUploadAndStart() {
    if (!zipFile) return;
    setUploading(true);
    setUploadStep(1);
    setUploadError(null);
    const t = setTimeout(() => setUploadStep(2), 1800);
    try {
      const result = await uploadResumesToJob(id, zipFile);
      clearTimeout(t);
      setZipFile(null);

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

      // Background-refresh for accurate progress data — don't await; the
      // optimistic update above already flipped the UI to the processing view.
      queryClient.invalidateQueries({ queryKey: ["screening", id] });
      queryClient.invalidateQueries({ queryKey: ["batch-progress", id] });
      queryClient.invalidateQueries({ queryKey: ["screenings"] });
    } catch (err) {
      clearTimeout(t);
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally { setUploading(false); setUploadStep(0); }
  }

  async function handleUploadMore() {
    if (!uploadMoreFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const result = await addResumesToJob(id, uploadMoreFile);
      setUploadMoreFile(null);
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
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally { setUploading(false); }
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

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="h-6 w-6 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!screening) {
    return (
      <div className="p-8 text-center">
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
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-8 pt-8 pb-4 shrink-0">
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs">
              <Link to="/screenings" className="text-[#737373] hover:text-[#0F0F0F]">Screenings</Link>
              <span className="text-[#D4D4D4]">/</span>
              <span className="text-[#404040]">{truncate(screening.title, 40)}</span>
            </div>
            <h1 className="text-2xl font-bold text-[#0F0F0F]">{screening.title}</h1>
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRubric(true)}
              className="h-9 px-4 border border-[#D4D4D4] text-sm font-medium text-[#404040] rounded-xl hover:bg-white transition-colors flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="2" width="11" height="10" rx="1.5"/><path d="M4.5 5h5M4.5 7.5h3"/></svg>
              Rubric
            </button>
            <button
              onClick={() => { setShowUploadMore((v) => !v); setUploadMoreFile(null); setUploadError(null); }}
              className={`h-9 px-4 border text-sm font-medium rounded-xl transition-colors flex items-center gap-2 ${showUploadMore ? "border-[#0F0F0F] bg-[#0F0F0F] text-white" : "border-[#D4D4D4] text-[#404040] hover:bg-white"}`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1.5v8M4 7l4-4 4 4"/><path d="M1.5 11.5h11"/></svg>
              Add resumes
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="h-9 px-4 border border-[#D4D4D4] text-sm font-medium text-[#404040] rounded-xl hover:bg-white transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              {exporting
                ? <span className="h-3.5 w-3.5 rounded-full border-2 border-[#404040] border-t-transparent animate-spin" />
                : <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1.5v8M4 7l3 3 3-3" /><path d="M1.5 10.5v1.5a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5v-1.5" /></svg>
              }
              Export CSV
            </button>
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
      <div className="flex-1 min-h-0 flex flex-col px-8 pb-8 gap-4">
        <div className="w-full space-y-4">
          {/* Draft upload */}
          {isDraft && (
            <div className="bg-white rounded-2xl border border-[#E8E5DF] p-8">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-lg font-semibold text-[#0F0F0F]">Upload resumes</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F0EDE8] border border-[#D4D4D4] text-xs font-semibold text-[#404040] tracking-wide">
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9.5h7M2 1.5h5l2 2v6"/><path d="M5 1.5v3h4"/></svg>
                  .ZIP only
                </span>
              </div>
              <p className="text-sm text-[#737373] mb-2">
                Compress all candidate resume files (PDF or DOCX) into a single <strong>.zip</strong> and upload below to start screening.
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

              {/* Upload stages — shown while uploading */}
              {uploading ? (
                <div className="border border-[#E8E5DF] rounded-2xl p-6 bg-[#FAFAF8]">
                  <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide mb-4">Upload progress</p>
                  {(
                    [
                      { label: "Sending ZIP to server", detail: zipFile?.name ?? "" },
                      { label: "Extracting & validating files", detail: "Checking PDF & DOCX files inside the archive" },
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
                        <div>
                          <p className={`text-sm font-medium ${active ? "text-[#0F0F0F]" : done ? "text-green-700" : "text-[#A0A0A0]"}`}>{s.label}</p>
                          {active && <p className="text-xs text-[#737373] mt-0.5 truncate max-w-xs">{s.detail}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : zipFile ? (
                /* File selected — ready to upload */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-[#D4D4D4] rounded-2xl p-6 cursor-pointer hover:border-[#A0A0A0] hover:bg-[#FAFAF8] transition-all"
                >
                  <input ref={fileInputRef} type="file" accept=".zip" className="hidden"
                    onChange={(e) => setZipFile(e.target.files?.[0] ?? null)} />
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-[#F0EDE8] border border-[#D4D4D4] flex items-center justify-center shrink-0">
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#404040" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19h14M4 3h9l5 5v11"/><path d="M13 3v6h6"/>
                        <path d="M9 12h4M9 15h4M9 9h2"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0F0F0F] truncate">{zipFile.name}</p>
                      <p className="text-xs text-[#737373] mt-0.5">
                        {zipFile.size > 1024 * 1024
                          ? `${(zipFile.size / 1024 / 1024).toFixed(1)} MB`
                          : `${(zipFile.size / 1024).toFixed(0)} KB`} · ZIP archive
                      </p>
                      <p className="text-xs text-[#A0A0A0] mt-1">Click to change file</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setZipFile(null); }}
                      className="h-7 w-7 rounded-lg text-[#A0A0A0] hover:text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8"/></svg>
                    </button>
                  </div>
                </div>
              ) : (
                /* Empty drop zone */
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                    dragActive ? "border-[#C85A17] bg-[#C85A1708]" : "border-[#D4D4D4] hover:border-[#A0A0A0] hover:bg-[#F5F3EE]"
                  }`}
                >
                  <input ref={fileInputRef} type="file" accept=".zip" className="hidden"
                    onChange={(e) => setZipFile(e.target.files?.[0] ?? null)} />
                  <div className="h-12 w-12 rounded-full bg-[#F5F3EE] border border-[#D4D4D4] flex items-center justify-center mx-auto mb-3">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v10M6 7l4-4 4 4"/><path d="M3 15h14"/></svg>
                  </div>
                  <p className="text-sm font-medium text-[#0F0F0F] mb-1">Drop your ZIP file here</p>
                  <p className="text-xs text-[#737373]">or click to browse</p>
                  <p className="text-xs font-semibold text-[#A0A0A0] mt-3 uppercase tracking-wide">ZIP format · contains PDF &amp; DOCX resumes</p>
                </div>
              )}

              <button
                onClick={handleUploadAndStart}
                disabled={!zipFile || uploading}
                className="mt-6 w-full h-11 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {uploading && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                {uploading ? "Processing…" : "Start screening"}
              </button>
            </div>
          )}

          {/* Add more resumes panel (non-draft screenings) */}
          {!isDraft && showUploadMore && (
            <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-[#0F0F0F]">Add more resumes</h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F0EDE8] border border-[#D4D4D4] text-xs font-semibold text-[#404040] tracking-wide">.PDF &amp; .DOCX</span>
                  </div>
                  <p className="text-xs text-[#737373] mt-1">Upload a single resume file. It will be scored and re-ranked against all existing candidates.</p>
                </div>
                <button onClick={() => { setShowUploadMore(false); setUploadMoreFile(null); setUploadError(null); }}
                  className="h-7 w-7 rounded-lg hover:bg-[#F5F3EE] flex items-center justify-center text-[#737373] shrink-0 ml-4">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
                </button>
              </div>
              {uploadError && (
                <div className="mt-3 mb-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{uploadError}</div>
              )}
              <div className="mt-4">
                {uploadMoreFile ? (
                  <div
                    onClick={() => uploadMoreFileInputRef.current?.click()}
                    className="border border-[#D4D4D4] rounded-2xl p-5 cursor-pointer hover:border-[#A0A0A0] hover:bg-[#FAFAF8] transition-all"
                  >
                    <input ref={uploadMoreFileInputRef} type="file" accept=".pdf,.docx" className="hidden"
                      onChange={(e) => setUploadMoreFile(e.target.files?.[0] ?? null)} />
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-[#F0EDE8] border border-[#D4D4D4] flex items-center justify-center shrink-0">
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#404040" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 18h12M4 2h8l4 4v12"/><path d="M12 2v5h5"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0F0F0F] truncate">{uploadMoreFile.name}</p>
                        <p className="text-xs text-[#737373] mt-0.5">
                          {uploadMoreFile.size > 1024 * 1024
                            ? `${(uploadMoreFile.size / 1024 / 1024).toFixed(1)} MB`
                            : `${(uploadMoreFile.size / 1024).toFixed(0)} KB`}
                          {" · "}{uploadMoreFile.name.endsWith(".pdf") ? "PDF" : "Word"} document
                        </p>
                        <p className="text-xs text-[#A0A0A0] mt-0.5">Click to change</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setUploadMoreFile(null); }}
                        className="h-7 w-7 rounded-lg text-[#A0A0A0] hover:text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0 transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8"/></svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setUploadMoreDragActive(true); }}
                    onDragLeave={() => setUploadMoreDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault(); setUploadMoreDragActive(false);
                      const f = e.dataTransfer.files[0];
                      if (f && (f.name.endsWith(".pdf") || f.name.endsWith(".docx"))) setUploadMoreFile(f);
                    }}
                    onClick={() => uploadMoreFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                      uploadMoreDragActive ? "border-[#C85A17] bg-[#C85A1708]" : "border-[#D4D4D4] hover:border-[#A0A0A0] hover:bg-[#F5F3EE]"
                    }`}
                  >
                    <input ref={uploadMoreFileInputRef} type="file" accept=".pdf,.docx" className="hidden"
                      onChange={(e) => setUploadMoreFile(e.target.files?.[0] ?? null)} />
                    <div className="h-10 w-10 rounded-full bg-[#F5F3EE] border border-[#D4D4D4] flex items-center justify-center mx-auto mb-3">
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v10M6 7l4-4 4 4"/><path d="M3 15h14"/></svg>
                    </div>
                    <p className="text-sm font-medium text-[#0F0F0F] mb-1">Drop a resume file here</p>
                    <p className="text-xs text-[#737373]">or click to browse</p>
                    <p className="text-xs font-semibold text-[#A0A0A0] mt-2 uppercase tracking-wide">PDF or DOCX · single file</p>
                  </div>
                )}
              </div>
              <button
                onClick={handleUploadMore}
                disabled={!uploadMoreFile || uploading}
                className="mt-4 w-full h-10 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {uploading && <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                {uploading ? "Uploading & scoring…" : "Add & re-rank"}
              </button>
            </div>
          )}

          {/* Processing banner */}
          {isProcessing && <ProcessingBanner progress={progress ?? null} totalFiles={screening.total_resumes} />}

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

          {/* In-flight files during processing */}
          {isProcessing && progress && <PendingFilesSection progress={progress} />}

          {/* Rubric modal */}
          {showRubric && (
            <RubricModal categories={rubricCategories} onClose={() => setShowRubric(false)} />
          )}
        </div>
      </div>
    </div>
  );
}


// ─── Tier Section ─────────────────────────────────────────────────────────────

interface TierSectionProps {
  tier: typeof TIERS[number];
  candidates: RankedCandidate[];
  collapsed: boolean;
  onToggle: () => void;
  categories: RubricCategory[];
  onSelect: (c: RankedCandidate) => void;
}

function TierSection({ tier, candidates, collapsed, onToggle, categories, onSelect }: TierSectionProps) {
  return (
    <div className="rounded-2xl border border-[#E8E5DF] bg-white overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-3 bg-[#F5F3EE] hover:bg-[#EFEAE0] transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tier.dot }} />
          <span className="text-sm font-semibold text-[#0F0F0F]">{tier.label}</span>
          <span className="text-xs text-[#737373]">· {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          className={`text-[#A0A0A0] transition-transform ${collapsed ? "" : "rotate-180"}`}><path d="M3 5l4 4 4-4" /></svg>
      </button>

      {!collapsed && (
        <div className="border-t border-[#E8E5DF] overflow-x-auto">
          <table className="w-full text-sm">
            <colgroup>
              <col style={{ minWidth: "200px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "72px" }} />
              {categories.map((cat) => (
                <col key={cat.name} style={{ width: "130px" }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-[#E8E5DF]">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-[#737373] uppercase tracking-wide">Candidate</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#737373] uppercase tracking-wide">Current Role</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-[#737373] uppercase tracking-wide">Score</th>
                {categories.map((cat) => (
                  <th key={cat.name} className="px-3 py-2.5 text-center text-xs font-semibold text-[#737373] uppercase tracking-wide">
                    <span className="block">{cat.name}</span>
                    <span className="font-normal text-[#A0A0A0] normal-case tracking-normal">{cat.weight}%</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5DF]">
              {candidates.map((c) => (
                <CandidateRow key={c.resume_id} candidate={c} categories={categories} onSelect={() => onSelect(c)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CandidateRow({ candidate, categories, onSelect }: {
  candidate: RankedCandidate; categories: RubricCategory[]; onSelect: () => void;
}) {
  // Compute category-level score = weighted avg of subcategory scores
  function getCategoryScore(cat: RubricCategory): number | null {
    const subs = cat.subcategories;
    if (subs.length === 0) return null;
    let weighted = 0, totalW = 0;
    for (const sub of subs) {
      const match = candidate.top_criteria.find(
        (tc) => tc.criterion.toLowerCase().trim() === sub.name.toLowerCase().trim()
      );
      if (match) {
        weighted += match.score * sub.weight;
        totalW += sub.weight;
      }
    }
    return totalW > 0 ? weighted / totalW : null;
  }

  // Find non-negotiable criteria that this candidate failed (score < 4)
  const failedNonNegotiables = categories
    .flatMap((cat) => cat.subcategories)
    .filter((sub) => sub.is_non_negotiable)
    .map((sub) => {
      const match = candidate.top_criteria.find(
        (tc) => tc.criterion.toLowerCase().trim() === sub.name.toLowerCase().trim()
      );
      return match && match.score < 4 ? sub.name : null;
    })
    .filter(Boolean) as string[];

  return (
    <tr onClick={onSelect} className={`cursor-pointer transition-colors hover:bg-[#FAFAF8] ${failedNonNegotiables.length > 0 ? "bg-red-50/40" : ""}`}>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[#FBF1E7] flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-[#C85A17]">{(candidate.candidate_name ?? candidate.filename).slice(0, 2).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0F0F0F] truncate">{candidate.candidate_name ?? candidate.filename}</p>
            {candidate.candidate_email && (
              <p className="text-xs text-[#737373] truncate">{candidate.candidate_email}</p>
            )}
            {candidate.candidate_phone && (
              <p className="text-xs text-[#737373] truncate">{candidate.candidate_phone}</p>
            )}
            {failedNonNegotiables.length > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="#DC2626">
                  <path d="M6 1L1 10h10L6 1z" />
                  <rect x="5.5" y="5" width="1" height="3" fill="white" rx="0.5" />
                  <circle cx="6" cy="9" r="0.6" fill="white" />
                </svg>
                <p className="text-xs text-red-600 font-medium">
                  Failed: {failedNonNegotiables.join(", ")}
                </p>
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-3.5 align-middle">
        <p className="text-xs text-[#404040] line-clamp-2">{candidate.candidate_current_job ?? <span className="text-[#D4D4D4]">—</span>}</p>
      </td>
      <td className="px-3 py-3.5 text-center align-middle">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-lg font-bold text-[#0F0F0F] leading-none">{Math.round(candidate.overall_score)}</span>
          <div className="w-12 h-1.5 bg-[#E8E5DF] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#C85A17]" style={{ width: `${candidate.overall_score}%` }} />
          </div>
        </div>
      </td>
      {categories.map((cat) => {
        const catScore = getCategoryScore(cat);
        return (
          <td key={cat.name} className="px-3 py-3.5 text-center align-middle">
            {catScore !== null ? (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-xs font-bold text-[#0F0F0F]">{catScore.toFixed(1)}</span>
                <div className="w-12 h-1.5 bg-[#E8E5DF] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#C85A17]" style={{ width: `${catScore * 10}%` }} />
                </div>
              </div>
            ) : (
              <span className="text-xs text-[#D4D4D4]">--</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}


// ─── Rubric Modal ─────────────────────────────────────────────────────────────

function RubricModal({ categories, onClose }: { categories: RubricCategory[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-[#E8E5DF] max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-[#E8E5DF] flex items-center justify-between z-10">
          <h2 className="text-base font-semibold text-[#0F0F0F]">Scoring Rubric</h2>
          <button onClick={onClose} className="h-7 w-7 rounded-lg hover:bg-[#F5F3EE] flex items-center justify-center text-[#737373]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {categories.map((cat) => (
            <div key={cat.name} className="border border-[#E8E5DF] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-[#F5F3EE] flex items-center justify-between">
                <span className="text-sm font-semibold text-[#0F0F0F]">{cat.name}</span>
                <span className="text-xs font-bold text-[#404040]">{cat.weight}%</span>
              </div>
              {cat.subcategories.length > 0 && (
                <div className="divide-y divide-[#E8E5DF]">
                  {cat.subcategories.map((sub) => (
                    <div key={sub.name} className="px-4 py-2.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-[#0F0F0F]">{sub.name}</p>
                          {sub.is_non_negotiable && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-red-100 text-red-700">Must Have</span>
                          )}
                          {sub.is_external_context && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-100 text-blue-700">External Signal</span>
                          )}
                        </div>
                        <p className="text-xs text-[#737373] mt-0.5">{sub.description}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((lvl) => (
                            <div
                              key={lvl}
                              title={["Low", "Moderate", "Standard", "Important", "Critical"][lvl - 1]}
                              className={`h-5 w-5 rounded-md text-[10px] font-bold flex items-center justify-center ${
                                lvl <= sub.weight
                                  ? "bg-[#0F0F0F] text-white"
                                  : "bg-[#F0EDE8] text-[#A0A0A0]"
                              }`}
                            >
                              {lvl}
                            </div>
                          ))}
                        </div>
                        <span className="text-[10px] text-[#A0A0A0] font-medium">
                          {["Low", "Moderate", "Standard", "Important", "Critical"][sub.weight - 1] ?? ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ─── Processing Banner ────────────────────────────────────────────────────────

function ProcessingBanner({ progress, totalFiles }: { progress: BatchProgress | null; totalFiles: number }) {
  const pct = progress?.percentage ?? 0;
  const scored = progress?.scored_count ?? 0;
  const failed = progress?.failed_count ?? 0;
  const total = progress?.total_files ?? totalFiles;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5DF] p-4 flex items-center gap-4">
      <div className="h-8 w-8 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-semibold text-[#0F0F0F]">
            {scored + failed} of {total} processed
            {failed > 0 && <span className="text-red-600 font-normal"> · {failed} failed</span>}
          </p>
          <span className="text-sm font-bold text-[#0F0F0F] shrink-0 ml-4">{pct}%</span>
        </div>
        <div className="h-1.5 w-full bg-[#E8E5DF] rounded-full overflow-hidden">
          <div className="h-full bg-[#0F0F0F] rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-[#A0A0A0] mt-1.5">Scored candidates appear below · Ranking finalizes when all complete</p>
      </div>
    </div>
  );
}


// ─── Pending Files Section ────────────────────────────────────────────────────

const STAGE_CONFIG: Record<string, { label: string; color: string; icon: "spin" | "check" | "error" | "wait" }> = {
  queued:  { label: "Waiting",  color: "text-[#A0A0A0]", icon: "wait"  },
  parsing: { label: "Parsing",  color: "text-blue-600",  icon: "spin"  },
  parsed:  { label: "Parsed",   color: "text-blue-600",  icon: "spin"  },
  scoring: { label: "Scoring",  color: "text-amber-600", icon: "spin"  },
  scored:  { label: "Done",     color: "text-green-700", icon: "check" },
  error:   { label: "Failed",   color: "text-red-600",   icon: "error" },
};

function PendingFilesSection({ progress }: { progress: BatchProgress }) {
  const pending = progress.per_file_results.filter(
    (f) => f.stage !== "scored" && f.stage !== "error",
  );
  if (pending.length === 0) return null;

  return (
    <div className="rounded-2xl border-2 border-[#E8E5DF] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 bg-[#F5F3EE]">
        <div className="h-2.5 w-2.5 rounded-full bg-[#A0A0A0]" />
        <span className="text-sm font-semibold text-[#737373]">Processing</span>
        <span className="text-xs text-[#737373] opacity-70">{pending.length} resume{pending.length !== 1 ? "s" : ""}</span>
        <div className="h-3.5 w-3.5 rounded-full border-2 border-[#A0A0A0] border-t-transparent animate-spin ml-auto" />
      </div>
      <div className="bg-white divide-y divide-[#E8E5DF]">
        {pending.map((f) => <PendingResumeRow key={f.resume_id} file={f} />)}
      </div>
    </div>
  );
}

function PendingResumeRow({ file }: { file: FileProgress }) {
  const config = STAGE_CONFIG[file.stage] ?? STAGE_CONFIG.queued;
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="h-8 w-8 rounded-full bg-[#F0EDE8] flex items-center justify-center shrink-0">
        {config.icon === "spin" && <div className="h-3.5 w-3.5 rounded-full border-2 border-[#A0A0A0] border-t-transparent animate-spin" />}
        {config.icon === "wait" && <div className="h-2 w-2 rounded-full bg-[#D4D4D4]" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#737373] truncate">{file.filename}</p>
        <div className="h-2 bg-[#E8E5DF] rounded-full animate-pulse w-1/3 mt-1.5" />
      </div>
      <span className={`text-xs font-medium ${config.color} shrink-0`}>{config.label}</span>
      {(file.stage === "parsing" || file.stage === "scoring") && (
        <span className="flex gap-0.5 shrink-0 ml-1">
          {[0, 200, 400].map((d) => (
            <span key={d} className="h-1 w-1 rounded-full bg-[#A0A0A0] animate-pulse" style={{ animationDelay: `${d}ms` }} />
          ))}
        </span>
      )}
    </div>
  );
}


// ─── Failed View ──────────────────────────────────────────────────────────────

function FailedView({ progress, hasResults }: { progress: BatchProgress | null; hasResults: boolean }) {
  const failedFiles = progress?.per_file_results.filter((f) => f.stage === "error") ?? [];
  const scored = progress?.scored_count ?? 0;
  const failed = progress?.failed_count ?? 0;
  const total = progress?.total_files ?? 0;

  return (
    <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
      <div className="flex items-start gap-3 mb-4">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mt-0.5 shrink-0">
          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM10 6v4M10 13h.01" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <div>
          <p className="text-sm font-semibold text-amber-800">{scored > 0 ? "Completed with some errors" : "Processing failed"}</p>
          <p className="text-xs text-amber-700 mt-1">
            {scored} of {total} resumes scored successfully.
            {failed > 0 && ` ${failed} could not be processed.`}
            {hasResults && " Results below are from the successful resumes."}
          </p>
        </div>
      </div>
      {failedFiles.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs font-semibold text-amber-700 uppercase tracking-wide cursor-pointer hover:text-amber-900">
            Show {failedFiles.length} failed resume{failedFiles.length !== 1 ? "s" : ""}
          </summary>
          <div className="mt-2 space-y-2">
            {failedFiles.map((f) => (
              <div key={f.resume_id} className="flex items-start gap-2 bg-amber-100/50 rounded-lg px-3 py-2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mt-0.5 shrink-0 text-amber-600">
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-amber-800 truncate">{f.filename}</p>
                  {f.error && <p className="text-xs text-amber-600 mt-0.5">{f.error}</p>}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}


// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, total, pageSize, onChange }: PaginationProps) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  // Build a compact page list: 1 … (cur-1) cur (cur+1) … last
  const pages: (number | "…")[] = [];
  const push = (p: number | "…") => pages.push(p);
  const window = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  let last: number | null = null;
  for (let i = 1; i <= totalPages; i++) {
    if (window.has(i) && i >= 1 && i <= totalPages) {
      if (last !== null && i - last > 1) push("…");
      push(i);
      last = i;
    }
  }

  const btnBase =
    "h-9 min-w-9 px-3 rounded-xl border text-sm font-medium transition-colors flex items-center justify-center";
  const btnIdle =
    "border-[#E8E5DF] bg-white text-[#404040] hover:bg-[#F5F3EE]";
  const btnActive =
    "border-[#0F0F0F] bg-[#0F0F0F] text-white";
  const btnDisabled =
    "border-[#E8E5DF] bg-white text-[#D4D4D4] cursor-not-allowed";

  return (
    <div className="flex items-center justify-between px-1 pt-1">
      <p className="text-xs text-[#737373]">
        Showing <span className="font-semibold text-[#404040]">{start}</span>–<span className="font-semibold text-[#404040]">{end}</span> of <span className="font-semibold text-[#404040]">{total}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`${btnBase} ${currentPage <= 1 ? btnDisabled : btnIdle}`}
          aria-label="Previous page"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 2.5L4 6l3.5 3.5"/></svg>
        </button>
        {pages.map((p, idx) =>
          p === "…" ? (
            <span key={`gap-${idx}`} className="px-1 text-xs text-[#A0A0A0]">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`${btnBase} ${p === currentPage ? btnActive : btnIdle}`}
              aria-current={p === currentPage ? "page" : undefined}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`${btnBase} ${currentPage >= totalPages ? btnDisabled : btnIdle}`}
          aria-label="Next page"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 2.5L8 6l-3.5 3.5"/></svg>
        </button>
      </div>
    </div>
  );
}
