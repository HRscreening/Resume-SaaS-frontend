import { useState, useRef } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getScreening, getResults, getBatchProgress, exportResults, uploadResumesToJob } from "@/lib/api";
import { scoreColor, scoreLabel, formatDate, truncate } from "@/lib/utils";
import type { Screening, RankedCandidate, BatchProgress, FileProgress } from "@/types";

export default function ScreeningDetail() {
  const { id } = useParams({ strict: false }) as { id: string };

  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<RankedCandidate | null>(null);

  // Upload state for draft jobs
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: screening,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["screening", id],
    queryFn: () => getScreening(id),
    refetchInterval: (query) => {
      const s = query.state.data;
      if (!s || s.status === "completed" || s.status === "failed" || s.status === "draft") return false;
      return 5000;
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["batch-progress", id],
    queryFn: () => getBatchProgress(id),
    enabled: !!screening && screening.status !== "draft",
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      const count = query.state.dataUpdateCount;
      return Math.min(3000 * Math.pow(1.5, count), 30000);
    },
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["results", id],
    queryFn: () => getResults(id),
    enabled: screening?.status === "completed" || screening?.status === "failed",
  });

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
    } catch {
      // Export failed — user will see the button re-enable
    } finally {
      setExporting(false);
    }
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
  const isProcessing = !isDraft && screening.status !== "completed" && screening.status !== "failed";

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".zip")) setZipFile(file);
  }

  async function handleUploadAndStart() {
    if (!zipFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      await uploadResumesToJob(id, zipFile);
      setZipFile(null);
      queryClient.invalidateQueries({ queryKey: ["screening", id] });
      queryClient.invalidateQueries({ queryKey: ["batch-progress", id] });
      queryClient.invalidateQueries({ queryKey: ["screenings"] });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/screenings" className="text-xs text-[#737373] hover:text-[#0F0F0F]">
              Screenings
            </Link>
            <span className="text-xs text-[#D4D4D4]">/</span>
            <span className="text-xs text-[#404040]">{truncate(screening.title, 40)}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0F0F0F]">{screening.title}</h1>
          <p className="text-sm text-[#737373] mt-1">
            {screening.total_resumes} resumes · Created {formatDate(screening.created_at)}
          </p>
        </div>

        {!isProcessing && candidates.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="h-9 px-4 border border-[#D4D4D4] text-sm font-medium text-[#404040] rounded-xl hover:bg-[#F5F3EE] transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              {exporting ? (
                <span className="h-3.5 w-3.5 rounded-full border-2 border-[#404040] border-t-transparent animate-spin" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 1.5v8M4 7l3 3 3-3" />
                  <path d="M1.5 10.5v1.5a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5v-1.5" />
                </svg>
              )}
              Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && !isProcessing && screening.status !== "failed" && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 mb-6 flex items-start gap-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
            <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 5v3.5M8 10.5h.01" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-amber-800">
            {error instanceof Error ? error.message : "An error occurred."}
          </p>
        </div>
      )}

      {/* Draft: show rubric summary + upload UI */}
      {isDraft && (
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-8 mb-6">
          <h2 className="text-lg font-semibold text-[#0F0F0F] mb-1">Upload resumes</h2>
          <p className="text-sm text-[#737373] mb-2">
            Rubric ready with {(screening.rubric as { criteria?: unknown[] })?.criteria?.length ?? 0} criteria.
            Upload a ZIP of resumes to start screening.
          </p>

          {/* Rubric preview */}
          <div className="flex flex-wrap gap-2 mb-6">
            {((screening.rubric as { criteria?: { name: string; type: string }[] })?.criteria ?? []).map((c, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-1 rounded-md border font-medium ${
                  c.type === "must"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : c.type === "should"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-green-50 text-green-700 border-green-200"
                }`}
              >
                {c.name}
              </span>
            ))}
          </div>

          {uploadError && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {uploadError}
            </div>
          )}

          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              dragActive
                ? "border-[#C85A17] bg-[#C85A1708]"
                : zipFile
                  ? "border-green-400 bg-green-50"
                  : "border-[#D4D4D4] hover:border-[#A0A0A0] hover:bg-[#F5F3EE]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
            />

            {zipFile ? (
              <div>
                <div className="h-12 w-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-3">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 10l4 4 8-8"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-[#0F0F0F]">{zipFile.name}</p>
                <p className="text-xs text-[#737373] mt-1">
                  {(zipFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setZipFile(null); }}
                  className="mt-3 text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <div className="h-12 w-12 rounded-full bg-[#F5F3EE] border border-[#D4D4D4] flex items-center justify-center mx-auto mb-3">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 3v10M6 7l4-4 4 4"/>
                    <path d="M3 15h14"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-[#0F0F0F] mb-1">
                  Drop your ZIP file here
                </p>
                <p className="text-xs text-[#737373]">or click to browse · .zip only</p>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-start gap-2 text-xs text-[#737373]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mt-0.5 shrink-0">
              <circle cx="6" cy="6" r="5"/>
              <path d="M6 5v3M6 4v.5"/>
            </svg>
            Supported formats: PDF, DOCX. Max 2GB zip.
          </div>

          <button
            onClick={handleUploadAndStart}
            disabled={!zipFile || uploading}
            className="mt-6 w-full h-11 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {uploading && (
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>
            )}
            {uploading ? "Uploading & processing…" : "Start screening"}
          </button>
        </div>
      )}

      {/* Processing state with per-resume progress */}
      {isProcessing && (
        <ProcessingView progress={progress ?? null} totalFiles={screening.total_resumes} />
      )}

      {/* Error/partial-failure banner — show when done with failures */}
      {!isProcessing && progress && (progress.failed_count ?? 0) > 0 && (
        <FailedView progress={progress} hasResults={candidates.length > 0} />
      )}

      {/* Total failure — no results at all */}
      {screening.status === "failed" && candidates.length === 0 && !(progress && (progress.failed_count ?? 0) > 0) && (
        <div className="bg-red-50 rounded-2xl border border-red-200 p-6 mb-6 text-center">
          <p className="text-sm font-semibold text-red-800">Screening failed</p>
          <p className="text-xs text-red-600 mt-1">All resumes failed to process. Please check the job description and try again.</p>
        </div>
      )}

      {/* Results — show whenever we have candidates, regardless of status */}
      {!isProcessing && candidates.length > 0 && (
        <div className="flex gap-6">
          {/* Candidates list */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E8E5DF] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#0F0F0F]">
                  {candidates.length} candidates ranked
                </h2>
                {screening.avg_score !== null && (
                  <span className="text-xs text-[#737373]">
                    Avg score: <strong className="text-[#0F0F0F]">{Math.round(screening.avg_score)}</strong>
                  </span>
                )}
              </div>

              <ul className="divide-y divide-[#E8E5DF]">
                {candidates.map((c) => (
                  <li key={c.resume_id}>
                    <button
                      onClick={() => setSelectedCandidate(
                        selectedCandidate?.resume_id === c.resume_id ? null : c
                      )}
                      className={`w-full text-left flex items-center gap-4 px-6 py-4 transition-colors ${
                        selectedCandidate?.resume_id === c.resume_id
                          ? "bg-[#F5F3EE]"
                          : "hover:bg-[#F5F3EE]"
                      }`}
                    >
                      <span className="text-xs font-bold text-[#A0A0A0] w-4 shrink-0">
                        #{c.rank}
                      </span>
                      <div className="h-9 w-9 rounded-full bg-[#F5F3EE] border border-[#E8E5DF] flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-[#404040]">
                          {(c.candidate_name ?? c.filename).slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0F0F0F] truncate">
                          {c.candidate_name ?? c.filename}
                        </p>
                        {c.candidate_current_job && (
                          <p className="text-xs text-[#404040] truncate">{c.candidate_current_job}</p>
                        )}
                        {c.candidate_email && (
                          <p className="text-xs text-[#737373] truncate">{c.candidate_email}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-bold ${scoreColor(c.overall_score)}`}>
                          {Math.round(c.overall_score)}
                        </p>
                        <p className="text-xs text-[#737373]">{scoreLabel(c.overall_score)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Candidate detail drawer */}
          {selectedCandidate && (
            <CandidateDrawer
              candidate={selectedCandidate}
              screeningId={id}
              onClose={() => setSelectedCandidate(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}


// --- Processing View ---

interface ProcessingViewProps {
  progress: BatchProgress | null;
  totalFiles: number;
}

function ProcessingView({ progress, totalFiles }: ProcessingViewProps) {
  const files = progress?.per_file_results ?? [];
  const pct = progress?.percentage ?? 0;
  const scored = progress?.scored_count ?? 0;
  const failed = progress?.failed_count ?? 0;
  const total = progress?.total_files ?? totalFiles;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6 mb-6">
      {/* Overall progress */}
      <div className="flex items-center gap-4 mb-5">
        <div className="h-10 w-10 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin shrink-0" />
        <div className="flex-1">
          <p className="text-base font-semibold text-[#0F0F0F]">Processing resumes...</p>
          <p className="text-sm text-[#737373]">
            {scored + failed} of {total} completed
            {failed > 0 && <span className="text-red-600"> · {failed} failed</span>}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-[#0F0F0F]">{pct}%</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full bg-[#E8E5DF] rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-[#0F0F0F] rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Per-resume status list */}
      {files.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide mb-3">
            Resume progress
          </p>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {files.map((f) => (
              <ResumeProgressRow key={f.resume_id} file={f} />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-[#A0A0A0] mt-4 text-center">Refreshing automatically...</p>
    </div>
  );
}


// --- Resume Progress Row ---

const STAGE_CONFIG: Record<string, { label: string; color: string; icon: "spin" | "check" | "error" | "wait" }> = {
  queued: { label: "Waiting", color: "text-[#A0A0A0]", icon: "wait" },
  parsing: { label: "Parsing", color: "text-blue-600", icon: "spin" },
  parsed: { label: "Parsed", color: "text-blue-600", icon: "spin" },
  scoring: { label: "Scoring", color: "text-amber-600", icon: "spin" },
  scored: { label: "Done", color: "text-green-700", icon: "check" },
  error: { label: "Failed", color: "text-red-600", icon: "error" },
};

function ResumeProgressRow({ file }: { file: FileProgress }) {
  const config = STAGE_CONFIG[file.stage] ?? STAGE_CONFIG.queued;

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F5F3EE] transition-colors">
      {/* Status icon */}
      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
        {config.icon === "spin" && (
          <div className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin text-blue-600" />
        )}
        {config.icon === "check" && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-green-700">
            <path d="M3 7.5l2.5 2.5L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {config.icon === "error" && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-red-600">
            <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
        {config.icon === "wait" && (
          <div className="h-2 w-2 rounded-full bg-[#D4D4D4]" />
        )}
      </div>

      {/* Filename */}
      <p className="text-xs text-[#404040] flex-1 min-w-0 truncate font-mono">
        {file.filename}
      </p>

      {/* Stage label */}
      <span className={`text-xs font-medium ${config.color} shrink-0`}>
        {config.label}
      </span>

      {/* Mini progress dots for active stages */}
      {(file.stage === "parsing" || file.stage === "scoring") && (
        <span className="flex gap-0.5 shrink-0">
          <span className="h-1 w-1 rounded-full bg-current animate-pulse" style={{ animationDelay: "0ms" }} />
          <span className="h-1 w-1 rounded-full bg-current animate-pulse" style={{ animationDelay: "200ms" }} />
          <span className="h-1 w-1 rounded-full bg-current animate-pulse" style={{ animationDelay: "400ms" }} />
        </span>
      )}

      {/* Error tooltip */}
      {file.error && (
        <span className="text-xs text-red-500 max-w-[200px] truncate" title={file.error}>
          {file.error}
        </span>
      )}
    </div>
  );
}


// --- Failed View ---

function FailedView({ progress, hasResults }: { progress: BatchProgress | null; hasResults: boolean }) {
  const failedFiles = progress?.per_file_results.filter((f) => f.stage === "error") ?? [];
  const scored = progress?.scored_count ?? 0;
  const failed = progress?.failed_count ?? 0;
  const total = progress?.total_files ?? 0;

  return (
    <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mt-0.5 shrink-0">
          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM10 6v4M10 13h.01" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-amber-800">
            {scored > 0 ? "Completed with some errors" : "Processing failed"}
          </p>
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
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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


// --- Candidate Drawer ---

interface CandidateDrawerProps {
  candidate: RankedCandidate;
  screeningId: string;
  onClose: () => void;
}

function CandidateDrawer({ candidate, screeningId, onClose }: CandidateDrawerProps) {
  return (
    <div className="w-80 shrink-0">
      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6 sticky top-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-base font-semibold text-[#0F0F0F]">
              {candidate.candidate_name ?? candidate.filename}
            </p>
            {candidate.candidate_email && (
              <p className="text-xs text-[#737373] mt-0.5">{candidate.candidate_email}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg text-[#737373] hover:bg-[#F5F3EE] flex items-center justify-center"
            aria-label="Close"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>

        {/* Overall score ring */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-[#F5F3EE] rounded-xl">
          <div className="relative h-16 w-16">
            <ScoreRing score={candidate.overall_score} />
            <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-[#0F0F0F]">
              {Math.round(candidate.overall_score)}
            </span>
          </div>
          <div>
            <p className={`text-lg font-bold ${scoreColor(candidate.overall_score)}`}>
              {scoreLabel(candidate.overall_score)}
            </p>
            <p className="text-xs text-[#737373]">Rank #{candidate.rank}</p>
          </div>
        </div>

        {/* Summary */}
        <p className="text-xs text-[#404040] leading-relaxed mb-5">
          {candidate.overall_summary}
        </p>

        {/* Criteria */}
        <div className="space-y-3 mb-5">
          <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide">Top criteria</p>
          {candidate.top_criteria.map((tc) => (
            <div key={tc.criterion}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[#404040] font-medium">{tc.criterion}</span>
                <span className="text-xs font-bold text-[#0F0F0F]">{tc.score}/10</span>
              </div>
              <div className="h-1.5 w-full bg-[#E8E5DF] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0F0F0F] rounded-full"
                  style={{ width: `${tc.score * 10}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <Link
          to="/screenings/$id/$resumeId" params={{ id: screeningId, resumeId: candidate.resume_id }}
          className="block w-full text-center h-9 leading-9 bg-[#0F0F0F] text-white text-xs font-medium rounded-xl hover:bg-[#1C1C1C] transition-colors"
        >
          View full report →
        </Link>
      </div>
    </div>
  );
}


// --- Score Ring ---

function ScoreRing({ score }: { score: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const stroke = score >= 75 ? "#16A34A" : score >= 50 ? "#D97706" : "#DC2626";

  return (
    <svg width="64" height="64" className="-rotate-90" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#E8E5DF" strokeWidth="5" />
      <circle cx="32" cy="32" r={r} fill="none" stroke={stroke} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={circ - fill} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  );
}
