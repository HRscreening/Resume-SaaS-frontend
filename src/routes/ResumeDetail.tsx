import { useState, useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getResumeDetail, getResumePdfUrl } from "@/lib/api";
import { confidenceColor, formatDate } from "@/lib/utils";
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

// ─── Tier helpers ─────────────────────────────────────────────────────────────

function getTierLabel(score: number) {
  if (score >= 75) return { label: "Strong Match", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", dot: "#22C55E" };
  if (score >= 55) return { label: "Potential",    color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200", dot: "#EAB308" };
  if (score >= 35) return { label: "Risky",        color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", dot: "#F97316" };
  return           { label: "Poor Fit",    color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    dot: "#EF4444" };
}

function criterionBarColor(score: number) {
  if (score >= 7) return "#22C55E";
  if (score >= 4) return "#EAB308";
  return "#EF4444";
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ResumeDetail() {
  const { id, resumeId } = useParams({ strict: false }) as { id: string; resumeId: string };

  const { data, isLoading } = useQuery({
    queryKey: ["resume-detail", id, resumeId],
    queryFn: () => getResumeDetail(id, resumeId) as Promise<ResumeDetailData>,
  });

  const { data: pdfData } = useQuery({
    queryKey: ["resume-pdf", id, resumeId],
    queryFn: () => getResumePdfUrl(id, resumeId),
    enabled: !!data,
    staleTime: 50 * 60 * 1000,
  });

  // Fetch PDF as blob so the iframe renders inline instead of triggering a download
  // (Supabase signed URLs have Content-Disposition: attachment by default)
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
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
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
        <Link to="/screenings/$id" params={{ id }} className="text-sm text-[#0F0F0F] underline">
          Back to results
        </Link>
      </div>
    );
  }

  const resume = data;
  const score = data.score;
  const tier = getTierLabel(score.overall_score);
  const initials = (resume.candidate_name ?? resume.original_filename).slice(0, 2).toUpperCase();
  const isPdf = resume.original_filename.toLowerCase().endsWith(".pdf");

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* ─── Top bar ─────────────────────────────────────────────── */}
      <header className="h-13 shrink-0 border-b border-[#E8E5DF] flex items-center gap-4 px-5 bg-white">
        <Link
          to="/screenings/$id"
          params={{ id }}
          className="flex items-center gap-1.5 text-sm text-[#737373] hover:text-[#0F0F0F] transition-colors shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 7H3M7 3l-4 4 4 4" />
          </svg>
          Back to results
        </Link>

        <div className="h-4 w-px bg-[#E8E5DF]" />

        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="h-7 w-7 rounded-full bg-[#F0EDE8] flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-[#404040]">{initials}</span>
          </div>
          <p className="text-sm font-semibold text-[#0F0F0F] truncate">
            {resume.candidate_name ?? resume.original_filename}
          </p>
          {resume.candidate_current_job && (
            <p className="text-xs text-[#737373] truncate hidden sm:block">{resume.candidate_current_job}</p>
          )}
        </div>

        {/* Score + tier pill */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${tier.bg} ${tier.border} shrink-0`}>
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tier.dot }} />
          <span className={`text-sm font-bold ${tier.color}`}>{Math.round(score.overall_score)}</span>
          <span className={`text-xs font-medium ${tier.color}`}>{tier.label}</span>
          {score.rank && <span className="text-xs text-[#737373]">· #{score.rank}</span>}
        </div>
      </header>

      {/* ─── Split body ───────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Left: PDF viewer */}
        <div className="w-[48%] shrink-0 flex flex-col border-r border-[#E8E5DF] bg-[#F5F3EE]">
          <div className="h-9 shrink-0 border-b border-[#E8E5DF] bg-white px-4 flex items-center justify-between">
            <span className="text-xs text-[#737373] font-medium truncate max-w-[70%]">
              {resume.original_filename}
            </span>
            {pdfData?.url && (
              <a
                href={pdfData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#737373] hover:text-[#0F0F0F] flex items-center gap-1"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V8M8 1h3v3M11 1 6 6" />
                </svg>
                Open
              </a>
            )}
          </div>

          <div className="flex-1 min-h-0 relative">
            {(pdfLoading || (!pdfBlobUrl && !pdfData?.url)) && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#F5F3EE]">
                <div className="h-5 w-5 rounded-full border-2 border-[#A0A0A0] border-t-transparent animate-spin" />
              </div>
            )}
            {pdfBlobUrl && isPdf && (
              <iframe
                src={pdfBlobUrl}
                className="w-full h-full border-0"
                title="Resume PDF"
              />
            )}
            {pdfData?.url && !isPdf && !pdfLoading && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-[#737373]">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 4H10a2 2 0 0 0-2 2v28a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V13z"/>
                  <path d="M23 4v9h9M14 22h12M14 28h8"/>
                </svg>
                <p className="text-sm font-medium text-[#404040]">DOCX — cannot preview in browser</p>
                <a href={pdfData.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-[#0F0F0F] underline">Download to view</a>
              </div>
            )}
          </div>
        </div>

        {/* Right: Analysis */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-xl mx-auto px-6 py-6 space-y-5">

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
                    <a href={`mailto:${resume.candidate_email}`} className="text-xs text-[#737373] hover:text-[#0F0F0F] transition-colors">
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

            {/* Strengths + Missing side by side */}
            {((score.strengths?.length ?? 0) > 0 || (score.missing_elements?.length ?? 0) > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {(score.strengths?.length ?? 0) > 0 && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-2.5">Strengths</p>
                    <ul className="space-y-1.5">
                      {score.strengths!.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-green-900">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                          {s}
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
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                          {s}
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
                {score.breakdown.map((cs, i) => (
                  <CriterionCard key={i} cs={cs} />
                ))}
              </div>
            </div>

            <p className="text-xs text-[#A0A0A0] pb-2">
              Scored {formatDate(score.created_at)} · {score.ai_model}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}


// ─── Criterion Card ───────────────────────────────────────────────────────────

function CriterionCard({ cs }: {
  cs: { criterion: string; score: number; confidence: "high" | "medium" | "low"; evidence: string[]; explanation: string }
}) {
  const [open, setOpen] = useState(false);
  const pct = cs.score * 10;
  const barColor = criterionBarColor(cs.score);

  return (
    <div className="bg-white border border-[#E8E5DF] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#FAFAF8] transition-colors"
      >
        {/* Score bar */}
        <div className="shrink-0 flex flex-col items-end gap-1 w-14">
          <span className="text-sm font-bold text-[#0F0F0F]">
            {cs.score}<span className="text-xs text-[#A0A0A0] font-normal">/10</span>
          </span>
          <div className="w-14 h-1.5 bg-[#E8E5DF] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#0F0F0F] truncate">{cs.criterion}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${confidenceColor(cs.confidence)}`}>
              {cs.confidence}
            </span>
          </div>
          {!open && cs.explanation && (
            <p className="text-xs text-[#737373] truncate mt-0.5">{cs.explanation}</p>
          )}
        </div>

        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round"
          className={`shrink-0 text-[#A0A0A0] transition-transform ${open ? "rotate-180" : ""}`}
        >
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
