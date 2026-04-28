import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getResumeDetail, getResumePdfUrl, getScreening } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Resume, Score } from "@/types";

interface ResumeDetailData extends Resume {
  parsed_text: string | null;
  parsed_data: Record<string, unknown> | null;
  extraction_method: string | null;
  error_message: string | null;
  page_count: number | null;
  char_count: number | null;
  score: Score | null;
}

function getTierLabel(score: number) {
  if (score >= 75) return { label: "Strong Match", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", dot: "#22C55E" };
  if (score >= 55) return { label: "Potential",    color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200", dot: "#EAB308" };
  if (score >= 35) return { label: "Risky",        color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", dot: "#F97316" };
  return             { label: "Poor Fit",    color: "text-red-700",   bg: "bg-red-50",    border: "border-red-200",    dot: "#EF4444" };
}

function criterionBarColor(score: number) {
  if (score >= 7) return "#22C55E";
  if (score >= 4) return "#EAB308";
  return "#EF4444";
}

export default function ResumeDetail() {
  const { id, resumeId } = useParams({ strict: false }) as { id: string; resumeId: string };

  // Panel layout state
  const [leftWidth, setLeftWidth]         = useState(42);      // % of body width — analysis panel
  const [pdfCollapsed, setPdfCollapsed]   = useState(false);   // hide PDF panel
  const [infoCollapsed, setInfoCollapsed] = useState(false);   // hide analysis panel
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging     = useRef(false);

  // Prevent both panels being collapsed simultaneously — must be before early returns
  useEffect(() => {
    if (pdfCollapsed && infoCollapsed) {
      setPdfCollapsed(false);
      setInfoCollapsed(false);
    }
  }, [pdfCollapsed, infoCollapsed]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const { left, width } = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - left) / width) * 100;
      setLeftWidth(Math.min(Math.max(pct, 20), 80));
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  // Data queries
  const { data, isLoading } = useQuery({
    queryKey: ["resume-detail", id, resumeId],
    queryFn: () => getResumeDetail(id, resumeId) as Promise<ResumeDetailData>,
  });

  const { data: screening } = useQuery({
    queryKey: ["screening", id],
    queryFn: () => getScreening(id),
    enabled: !!data,
    staleTime: 5 * 60 * 1000,
  });

  // Build set of non-negotiable criterion names from rubric
  const nonNegotiableSet = useMemo(() => {
    const set = new Set<string>();
    screening?.rubric?.categories?.forEach((cat) =>
      cat.subcategories?.forEach((sub) => {
        if (sub.is_non_negotiable) set.add(sub.name);
      })
    );
    return set;
  }, [screening]);

  const { data: pdfData } = useQuery({
    queryKey: ["resume-pdf", id, resumeId],
    queryFn: () => getResumePdfUrl(id, resumeId),
    enabled: !!data,
    staleTime: 50 * 60 * 1000,
  });

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!pdfData?.url) return;
    let objectUrl: string | null = null;
    setPdfLoading(true);
    fetch(pdfData.url)
      .then((r) => r.blob())
      .then((blob) => {
        objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setPdfBlobUrl(objectUrl);
      })
      .catch(() => {})
      .finally(() => setPdfLoading(false));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [pdfData?.url]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!data || !data.score) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-[#737373]">Resume not found or not yet scored.</p>
        <Link to="/screenings/$id" params={{ id }} className="text-sm text-[#0F0F0F] underline">Back to results</Link>
      </div>
    );
  }

  const resume = data;
  const score  = data.score;
  const tier   = getTierLabel(score.overall_score);
  const initials = (resume.candidate_name ?? resume.original_filename).slice(0, 2).toUpperCase();
  const isPdf    = resume.original_filename.toLowerCase().endsWith(".pdf");

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">

      {/* ─── Top bar ───────────────────────────────────────────── */}
      <header className="h-12 shrink-0 border-b border-[#E8E5DF] flex items-center gap-3 px-5 bg-white">
        <Link
          to="/screenings/$id" params={{ id }}
          className="flex items-center gap-1.5 text-sm text-[#737373] hover:text-[#0F0F0F] transition-colors shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 7H3M7 3l-4 4 4 4" />
          </svg>
          Back
        </Link>

        <div className="h-4 w-px bg-[#E8E5DF]" />

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="h-7 w-7 rounded-full bg-[#F0EDE8] flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-[#404040]">{initials}</span>
          </div>
          <p className="text-sm font-semibold text-[#0F0F0F] truncate">
            {resume.candidate_name ?? resume.original_filename}
          </p>
          {resume.candidate_current_job && (
            <p className="text-xs text-[#737373] truncate hidden md:block">{resume.candidate_current_job}</p>
          )}
        </div>

        {/* Score pill */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold shrink-0 ${tier.bg} ${tier.border} ${tier.color}`}>
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tier.dot }} />
          {Math.round(score.overall_score)} · {tier.label}
          {score.rank && <span className="text-xs font-normal text-[#737373] ml-1">#{score.rank}</span>}
        </div>

        {/* Panel toggles */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <button
            onClick={() => { setPdfCollapsed(false); setInfoCollapsed(false); setLeftWidth(42); }}
            title="Reset layout"
            className="h-7 px-2 rounded-lg text-xs text-[#737373] hover:bg-[#F5F3EE] hover:text-[#0F0F0F] transition-colors"
          >
            ⊟
          </button>
          <button
            onClick={() => { setPdfCollapsed(false); setInfoCollapsed(true); }}
            title="PDF only"
            className={`h-7 px-2 rounded-lg text-xs transition-colors ${infoCollapsed && !pdfCollapsed ? "bg-[#0F0F0F] text-white" : "text-[#737373] hover:bg-[#F5F3EE] hover:text-[#0F0F0F]"}`}
          >
            PDF only
          </button>
          <button
            onClick={() => { setPdfCollapsed(true); setInfoCollapsed(false); }}
            title="Analysis only"
            className={`h-7 px-2 rounded-lg text-xs transition-colors ${pdfCollapsed && !infoCollapsed ? "bg-[#0F0F0F] text-white" : "text-[#737373] hover:bg-[#F5F3EE] hover:text-[#0F0F0F]"}`}
          >
            Analysis only
          </button>
        </div>
      </header>

      {/* ─── Body ──────────────────────────────────────────────── */}
      <div ref={containerRef} className="flex flex-1 min-h-0 overflow-hidden select-none">

        {/* Collapsed analysis restore strip — LEFT edge */}
        {infoCollapsed && !pdfCollapsed && (
          <button
            onClick={() => setInfoCollapsed(false)}
            className="w-8 shrink-0 border-r border-[#E8E5DF] bg-white hover:bg-[#F5F3EE] transition-colors flex flex-col items-center justify-center gap-2 text-[#737373] hover:text-[#0F0F0F]"
            title="Show analysis"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M5 2l5 5-5 5" />
            </svg>
            <span className="text-xs font-medium" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Analysis</span>
          </button>
        )}

        {/* Left: Analysis panel */}
        {!infoCollapsed && (
          <div
            className="flex flex-col border-r border-[#E8E5DF] overflow-y-auto"
            style={{ width: pdfCollapsed ? "100%" : `${leftWidth}%` }}
          >
            <div className="max-w-xl mx-auto px-6 py-6 space-y-5 w-full">

              {/* Hide analysis button */}
              {!pdfCollapsed && (
                <div className="flex justify-end -mb-2">
                  <button onClick={() => setInfoCollapsed(true)}
                    className="text-xs text-[#A0A0A0] hover:text-[#0F0F0F] flex items-center gap-1 transition-colors">
                    Hide analysis
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M9 2l5 5-5 5" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Candidate info */}
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-[#F0EDE8] border border-[#E8E5DF] flex items-center justify-center shrink-0">
                  <span className="text-base font-bold text-[#404040]">{initials}</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-[#0F0F0F] leading-tight">
                    {resume.candidate_name ?? resume.original_filename}
                  </h1>
                  {resume.candidate_current_job && (
                    <p className="text-sm text-[#404040] mt-0.5">{resume.candidate_current_job}</p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                    {resume.candidate_email && (
                      <a href={`mailto:${resume.candidate_email}`} className="text-xs text-[#737373] hover:text-[#0F0F0F]">
                        {resume.candidate_email}
                      </a>
                    )}
                    {resume.candidate_phone && (
                      <span className="text-xs text-[#737373]">{resume.candidate_phone}</span>
                    )}
                    {resume.page_count && (
                      <span className="text-xs text-[#A0A0A0]">{resume.page_count}p resume</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary */}
              {score.overall_summary && (
                <div className="bg-[#F5F3EE] rounded-xl p-4">
                  <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide mb-2">AI Summary</p>
                  <p className="text-sm text-[#404040] leading-relaxed">{score.overall_summary}</p>
                </div>
              )}

              {/* Strengths + Missing */}
              {((score.strengths?.length ?? 0) > 0 || (score.missing_elements?.length ?? 0) > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {(score.strengths?.length ?? 0) > 0 && (
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                      <p className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-2.5">Strengths</p>
                      <ul className="space-y-1.5">
                        {score.strengths!.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-green-900">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(score.missing_elements?.length ?? 0) > 0 && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                      <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2.5">Missing</p>
                      <ul className="space-y-1.5">
                        {score.missing_elements!.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-red-900">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Criteria breakdown */}
              <div>
                <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide mb-3">Criteria Breakdown</p>
                <div className="space-y-2">
                  {[...score.breakdown]
                    .sort((a, b) => {
                      const aNn = nonNegotiableSet.has(a.criterion) ? 1 : 0;
                      const bNn = nonNegotiableSet.has(b.criterion) ? 1 : 0;
                      return bNn - aNn;
                    })
                    .map((cs, i) => (
                      <CriterionCard
                        key={i}
                        cs={cs}
                        isNonNegotiable={nonNegotiableSet.has(cs.criterion)}
                      />
                    ))
                  }
                </div>
              </div>

              <p className="text-xs text-[#A0A0A0] pb-2">
                Scored {formatDate(score.created_at)} · {score.ai_model}
              </p>
            </div>
          </div>
        )}

        {/* Drag divider */}
        {!pdfCollapsed && !infoCollapsed && (
          <div
            onMouseDown={startDrag}
            className="w-1.5 shrink-0 bg-[#E8E5DF] hover:bg-[#C85A17] cursor-col-resize transition-colors flex items-center justify-center group"
            title="Drag to resize"
          >
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {[0,1,2,3,4].map((i) => <div key={i} className="h-0.5 w-0.5 rounded-full bg-white" />)}
            </div>
          </div>
        )}

        {/* Right: PDF panel */}
        {!pdfCollapsed && (
          <div className="flex flex-col bg-[#F5F3EE] overflow-hidden flex-1 min-w-0">
            {/* PDF panel header */}
            <div className="h-9 shrink-0 border-b border-[#E8E5DF] bg-white px-4 flex items-center justify-between">
              <span className="text-xs text-[#737373] font-medium truncate max-w-[70%]">
                {resume.original_filename}
              </span>
              <div className="flex items-center gap-2">
                {pdfData?.url && (
                  <a href={pdfData.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#737373] hover:text-[#0F0F0F] flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V8M8 1h3v3M11 1 6 6" />
                    </svg>
                    Open
                  </a>
                )}
                {!infoCollapsed && (
                  <button onClick={() => setPdfCollapsed(true)}
                    title="Hide PDF"
                    className="text-[#A0A0A0] hover:text-[#0F0F0F] transition-colors">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M5 2l5 5-5 5" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* PDF viewer */}
            <div className="flex-1 min-h-0 relative">
              {(pdfLoading || (!pdfBlobUrl && isPdf)) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-5 w-5 rounded-full border-2 border-[#A0A0A0] border-t-transparent animate-spin" />
                </div>
              )}
              {pdfBlobUrl && isPdf && (
                <iframe src={pdfBlobUrl} className="w-full h-full border-0" title="Resume PDF" />
              )}
              {pdfData?.url && !isPdf && !pdfLoading && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-[#737373]">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 4H10a2 2 0 0 0-2 2v28a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V13z"/>
                    <path d="M23 4v9h9M14 22h12M14 28h8"/>
                  </svg>
                  <p className="text-sm font-medium text-[#404040]">DOCX — cannot preview</p>
                  <a href={pdfData.url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-[#0F0F0F] underline">Download to view</a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collapsed PDF restore strip — RIGHT edge */}
        {pdfCollapsed && !infoCollapsed && (
          <button
            onClick={() => setPdfCollapsed(false)}
            className="w-8 shrink-0 border-l border-[#E8E5DF] bg-[#F5F3EE] hover:bg-[#EAE7E1] transition-colors flex flex-col items-center justify-center gap-2 text-[#737373] hover:text-[#0F0F0F]"
            title="Show PDF"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M9 2l-5 5 5 5" />
            </svg>
            <span className="text-xs font-medium" style={{ writingMode: "vertical-rl" }}>PDF</span>
          </button>
        )}

      </div>
    </div>
  );
}


// ─── Criterion Card ───────────────────────────────────────────────────────────

function CriterionCard({ cs, isNonNegotiable = false }: {
  cs: { criterion: string; score: number; confidence: "high" | "medium" | "low"; evidence: string[]; explanation: string };
  isNonNegotiable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pct      = cs.score * 10;
  const barColor = criterionBarColor(cs.score);
  const failed   = isNonNegotiable && cs.score < 4;

  const borderClass = failed
    ? "border-red-400 bg-red-50"
    : isNonNegotiable
      ? "border-amber-300 bg-amber-50/30"
      : "border-[#E8E5DF] bg-white";

  return (
    <div className={`border rounded-xl overflow-hidden ${borderClass}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/5 transition-colors"
      >
        <div className="shrink-0 w-14">
          <span className="text-sm font-bold text-[#0F0F0F]">
            {cs.score}<span className="text-xs text-[#A0A0A0] font-normal">/10</span>
          </span>
          <div className="w-14 h-1.5 bg-[#E8E5DF] rounded-full overflow-hidden mt-1">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[#0F0F0F] truncate">{cs.criterion}</span>
            {isNonNegotiable && (
              <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-semibold ${
                failed ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
              }`}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 1L1 10h10L6 1z" />
                  <rect x="5.5" y="5" width="1" height="3" fill="white" rx="0.5" />
                  <circle cx="6" cy="9" r="0.6" fill="white" />
                </svg>
                Must Have{failed ? " · FAILED" : ""}
              </span>
            )}
          </div>
          {!open && cs.explanation && (
            <p className="text-xs text-[#737373] truncate mt-0.5">{cs.explanation}</p>
          )}
        </div>

        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round"
          className={`shrink-0 text-[#A0A0A0] transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M3 5l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-[#E8E5DF] pt-3 space-y-3">
          {cs.explanation && (
            <p className="text-xs text-[#404040] leading-relaxed">{cs.explanation}</p>
          )}
          {cs.evidence.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide">Evidence</p>
              {cs.evidence.map((q, j) => (
                <blockquote key={j} className="border-l-2 border-[#C85A17] pl-3 text-xs text-[#404040] italic leading-relaxed">
                  &ldquo;{q}&rdquo;
                </blockquote>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
