import { useState, useRef, useEffect } from "react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getScreening, getResults, getBatchProgress, exportResults,
  uploadResumesToJob,
} from "@/lib/api";
import { formatDate, truncate } from "@/lib/utils";
import type { RankedCandidate, BatchProgress, FileProgress, RubricCategory } from "@/types";

// ─── Tier config ─────────────────────────────────────────────────────────────

const TIERS = [
  { id: "strong",    label: "Strong Match", min: 75, dot: "#22C55E", bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700"  },
  { id: "potential", label: "Potential",    min: 55, dot: "#EAB308", bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700" },
  { id: "risky",     label: "Risky",        min: 35, dot: "#F97316", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
  { id: "poor",      label: "Poor Fit",     min: 0,  dot: "#EF4444", bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700"    },
];

type TierId = "strong" | "potential" | "risky" | "poor";

function getTier(score: number) {
  if (score >= 75) return TIERS[0];
  if (score >= 55) return TIERS[1];
  if (score >= 35) return TIERS[2];
  return TIERS[3];
}

function abbrev(name: string): string {
  const words = name.trim().split(/[\s/_-]+/).filter(Boolean);
  if (words.length >= 2) return words.map((w) => w[0]).join("").toUpperCase().slice(0, 5);
  return name.length <= 5 ? name : name.slice(0, 4);
}

function dotColor(score: number): string {
  if (score >= 7) return "#22C55E";
  if (score >= 4) return "#EAB308";
  return "#EF4444";
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScreeningDetail() {
  const { id } = useParams({ strict: false }) as { id: string };
  const queryClient = useQueryClient();

  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [collapsedTiers, setCollapsedTiers] = useState<Set<TierId>>(new Set(["poor"]));
  const [showRubric, setShowRubric] = useState(false);

  const [zipFile, setZipFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Poll every 4s while processing, stop once we have results or batch is done
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && data.length > 0) return false; // have results, stop
      if (batchDone) return false;
      return 4000;
    },
  });

  // Instant results fetch when batch completes — no waiting for next poll cycle
  useEffect(() => {
    if (batchDone && candidates.length === 0) {
      queryClient.invalidateQueries({ queryKey: ["results", id] });
      queryClient.invalidateQueries({ queryKey: ["screening", id] });
    }
  }, [batchDone, candidates.length, id, queryClient]);

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
    setUploadError(null);
    try {
      await uploadResumesToJob(id, zipFile);
      setZipFile(null);
      queryClient.invalidateQueries({ queryKey: ["screening", id] });
      queryClient.invalidateQueries({ queryKey: ["batch-progress", id] });
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

  const tierGroups = TIERS.map((tier) => ({
    tier,
    candidates: candidates.filter((c) => getTier(c.overall_score).id === tier.id),
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
              {candidates.length > 0
                ? `Grouped by fit · ${candidates.length} candidates`
                : `${screening.total_resumes} resumes · Created ${formatDate(screening.created_at)}`}
            </p>
          </div>
          {!isProcessing && candidates.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRubric(true)}
              className="h-9 px-4 border border-[#D4D4D4] text-sm font-medium text-[#404040] rounded-xl hover:bg-white transition-colors flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="2" width="11" height="10" rx="1.5"/><path d="M4.5 5h5M4.5 7.5h3"/></svg>
              Rubric
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

        {/* Tier pills + legend */}
        {candidates.length > 0 && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {tierGroups.map(({ tier, candidates: tc }) => (
              <button
                key={tier.id}
                onClick={() => toggleTier(tier.id as TierId)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border-2 text-sm font-semibold transition-opacity ${tier.bg} ${tier.border} ${tier.text} ${tc.length === 0 ? "opacity-40 cursor-default" : ""}`}
                disabled={tc.length === 0}
              >
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tier.dot }} />
                {tier.label}
                <span>{tc.length}</span>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                  className={`transition-transform ${collapsedTiers.has(tier.id as TierId) ? "" : "rotate-180"}`}>
                  <path d="M2 4l3.5 3.5L9 4" />
                </svg>
              </button>
            ))}
            <div className="ml-auto flex items-center gap-4 text-xs text-[#737373]">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" />Met</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-yellow-400 inline-block" />Partial</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />Missing</span>
            </div>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 flex flex-col px-8 pb-8 gap-4">
        <div className="w-full space-y-4">
          {/* Draft upload */}
          {isDraft && (
            <div className="bg-white rounded-2xl border border-[#E8E5DF] p-8">
              <h2 className="text-lg font-semibold text-[#0F0F0F] mb-1">Upload resumes</h2>
              <p className="text-sm text-[#737373] mb-2">
                Rubric ready with {rubricCategories.length} categories. Upload a ZIP of resumes to start screening.
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
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  dragActive ? "border-[#C85A17] bg-[#C85A1708]"
                  : zipFile ? "border-green-400 bg-green-50"
                  : "border-[#D4D4D4] hover:border-[#A0A0A0] hover:bg-[#F5F3EE]"
                }`}
              >
                <input ref={fileInputRef} type="file" accept=".zip" className="hidden"
                  onChange={(e) => setZipFile(e.target.files?.[0] ?? null)} />
                {zipFile ? (
                  <div>
                    <div className="h-12 w-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-3">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10l4 4 8-8"/></svg>
                    </div>
                    <p className="text-sm font-medium text-[#0F0F0F]">{zipFile.name}</p>
                    <p className="text-xs text-[#737373] mt-1">{(zipFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setZipFile(null); }}
                      className="mt-3 text-xs text-red-600 hover:underline">Remove</button>
                  </div>
                ) : (
                  <div>
                    <div className="h-12 w-12 rounded-full bg-[#F5F3EE] border border-[#D4D4D4] flex items-center justify-center mx-auto mb-3">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v10M6 7l4-4 4 4"/><path d="M3 15h14"/></svg>
                    </div>
                    <p className="text-sm font-medium text-[#0F0F0F] mb-1">Drop your ZIP file here</p>
                    <p className="text-xs text-[#737373]">or click to browse · .zip only</p>
                  </div>
                )}
              </div>
              <button
                onClick={handleUploadAndStart}
                disabled={!zipFile || uploading}
                className="mt-6 w-full h-11 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {uploading && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                {uploading ? "Uploading & processing…" : "Start screening"}
              </button>
            </div>
          )}

          {/* Processing */}
          {isProcessing && <ProcessingView progress={progress ?? null} totalFiles={screening.total_resumes} />}

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

          {/* Tiered results */}
          {!isProcessing && candidates.length > 0 && tierGroups.map(({ tier, candidates: tc }) => {
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

// Category colors for table headers
const CAT_COLORS = ["#3B82F6", "#F59E0B", "#8B5CF6"];

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
    <div className={`rounded-2xl border-2 overflow-hidden ${tier.border}`}>
      <button onClick={onToggle} className={`w-full flex items-center justify-between px-5 py-3.5 ${tier.bg}`}>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tier.dot }} />
          <span className={`text-sm font-semibold ${tier.text}`}>{tier.label}</span>
          <span className={`text-xs ${tier.text} opacity-70`}>{candidates.length} candidate{candidates.length !== 1 ? "s" : ""}</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          className={`${tier.text} transition-transform ${collapsed ? "" : "rotate-180"}`}><path d="M3 5l4 4 4-4" /></svg>
      </button>

      {!collapsed && (
        <div className="bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E5DF]">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-[#737373] uppercase tracking-wide">Candidate</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-[#737373] uppercase tracking-wide">Score</th>
                {categories.map((cat, i) => (
                  <th key={cat.name} className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: CAT_COLORS[i] }}>
                    {abbrev(cat.name)} <span className="font-normal text-[#A0A0A0]">{cat.weight}%</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5DF]">
              {candidates.map((c) => (
                <CandidateRow key={c.resume_id} candidate={c} tier={tier} categories={categories} onSelect={() => onSelect(c)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CandidateRow({ candidate, tier, categories, onSelect }: {
  candidate: RankedCandidate; tier: typeof TIERS[number]; categories: RubricCategory[]; onSelect: () => void;
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

  return (
    <tr onClick={onSelect} className="cursor-pointer transition-colors hover:bg-[#FAFAF8]">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[#F0EDE8] flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-[#404040]">{(candidate.candidate_name ?? candidate.filename).slice(0, 2).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0F0F0F] truncate max-w-[180px]">{candidate.candidate_name ?? candidate.filename}</p>
            {candidate.candidate_current_job && <p className="text-xs text-[#737373] truncate max-w-[180px]">{candidate.candidate_current_job}</p>}
          </div>
        </div>
      </td>
      <td className="px-3 py-3.5 text-center">
        <span className={`text-base font-bold ${tier.text}`}>{Math.round(candidate.overall_score)}</span>
      </td>
      {categories.map((cat, i) => {
        const catScore = getCategoryScore(cat);
        return (
          <td key={cat.name} className="px-3 py-3.5 text-center">
            {catScore !== null ? (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs font-bold" style={{ color: dotColor(catScore) }}>{catScore.toFixed(1)}</span>
                <div className="w-10 h-1.5 bg-[#E8E5DF] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${catScore * 10}%`, backgroundColor: dotColor(catScore) }} />
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
          {categories.map((cat, i) => (
            <div key={cat.name} className="border border-[#E8E5DF] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-[#F5F3EE] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CAT_COLORS[i] }} />
                  <span className="text-sm font-semibold text-[#0F0F0F]">{cat.name}</span>
                </div>
                <span className="text-xs font-bold text-[#404040]">{cat.weight}%</span>
              </div>
              {cat.subcategories.length > 0 && (
                <div className="divide-y divide-[#E8E5DF]">
                  {cat.subcategories.map((sub) => (
                    <div key={sub.name} className="px-4 py-2.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#0F0F0F]">{sub.name}</p>
                        <p className="text-xs text-[#737373] mt-0.5">{sub.description}</p>
                      </div>
                      <span className="text-xs font-semibold text-[#404040] shrink-0">{sub.weight}%</span>
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


// ─── Processing View ──────────────────────────────────────────────────────────

function ProcessingView({ progress, totalFiles }: { progress: BatchProgress | null; totalFiles: number }) {
  const files = progress?.per_file_results ?? [];
  const pct = progress?.percentage ?? 0;
  const scored = progress?.scored_count ?? 0;
  const failed = progress?.failed_count ?? 0;
  const total = progress?.total_files ?? totalFiles;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
      <div className="flex items-center gap-4 mb-5">
        <div className="h-10 w-10 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin shrink-0" />
        <div className="flex-1">
          <p className="text-base font-semibold text-[#0F0F0F]">Processing resumes...</p>
          <p className="text-sm text-[#737373]">
            {scored + failed} of {total} completed
            {failed > 0 && <span className="text-red-600"> · {failed} failed</span>}
          </p>
        </div>
        <p className="text-2xl font-bold text-[#0F0F0F] shrink-0">{pct}%</p>
      </div>
      <div className="h-2 w-full bg-[#E8E5DF] rounded-full overflow-hidden mb-6">
        <div className="h-full bg-[#0F0F0F] rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>
      {files.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide mb-3">Resume progress</p>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {files.map((f) => <ResumeProgressRow key={f.resume_id} file={f} />)}
          </div>
        </div>
      )}
      <p className="text-xs text-[#A0A0A0] mt-4 text-center">Refreshing automatically...</p>
    </div>
  );
}


// ─── Resume Progress Row ──────────────────────────────────────────────────────

const STAGE_CONFIG: Record<string, { label: string; color: string; icon: "spin" | "check" | "error" | "wait" }> = {
  queued:  { label: "Waiting",  color: "text-[#A0A0A0]",   icon: "wait"  },
  parsing: { label: "Parsing",  color: "text-blue-600",    icon: "spin"  },
  parsed:  { label: "Parsed",   color: "text-blue-600",    icon: "spin"  },
  scoring: { label: "Scoring",  color: "text-amber-600",   icon: "spin"  },
  scored:  { label: "Done",     color: "text-green-700",   icon: "check" },
  error:   { label: "Failed",   color: "text-red-600",     icon: "error" },
};

function ResumeProgressRow({ file }: { file: FileProgress }) {
  const config = STAGE_CONFIG[file.stage] ?? STAGE_CONFIG.queued;
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F5F3EE] transition-colors">
      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
        {config.icon === "spin"  && <div className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin text-blue-600" />}
        {config.icon === "check" && <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-green-700"><path d="M3 7.5l2.5 2.5L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        {config.icon === "error" && <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-red-600"><path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        {config.icon === "wait"  && <div className="h-2 w-2 rounded-full bg-[#D4D4D4]" />}
      </div>
      <p className="text-xs text-[#404040] flex-1 min-w-0 truncate font-mono">{file.filename}</p>
      <span className={`text-xs font-medium ${config.color} shrink-0`}>{config.label}</span>
      {(file.stage === "parsing" || file.stage === "scoring") && (
        <span className="flex gap-0.5 shrink-0">
          {[0, 200, 400].map((d) => <span key={d} className="h-1 w-1 rounded-full bg-current animate-pulse" style={{ animationDelay: `${d}ms` }} />)}
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
