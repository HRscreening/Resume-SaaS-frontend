import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getResumeDetail, getResumePdfUrl } from "@/lib/api";
import { scoreColor, scoreLabel, confidenceColor, formatDate } from "@/lib/utils";
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

export default function ResumeDetail() {
  const { id, resumeId } = useParams({ strict: false }) as { id: string; resumeId: string };

  const [pdfLoading, setPdfLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["resume-detail", id, resumeId],
    queryFn: () => getResumeDetail(id, resumeId) as Promise<ResumeDetailData>,
  });

  async function handleViewPdf() {
    setPdfLoading(true);
    try {
      const { url } = await getResumePdfUrl(id, resumeId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      // silently ignore — user will notice nothing opened
    } finally {
      setPdfLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="h-6 w-6 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!data || !data.score) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-[#737373]">Resume not found or not yet scored.</p>
        <Link
          to="/screenings/$id" params={{ id }}
          className="text-sm text-[#0F0F0F] underline mt-2 inline-block"
        >
          Back to results
        </Link>
      </div>
    );
  }

  const resume = data;
  const score = data.score;
  const scoreNum = Math.round(score.overall_score);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-xs">
        <Link to="/screenings" className="text-[#737373] hover:text-[#0F0F0F]">
          Screenings
        </Link>
        <span className="text-[#D4D4D4]">/</span>
        <Link to="/screenings/$id" params={{ id }} className="text-[#737373] hover:text-[#0F0F0F]">
          Results
        </Link>
        <span className="text-[#D4D4D4]">/</span>
        <span className="text-[#404040]">{resume.candidate_name ?? resume.original_filename}</span>
      </div>

      {/* Score card */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6 mb-5">
        <div className="flex items-start gap-6">
          {/* Score ring */}
          <div className="shrink-0 flex flex-col items-center gap-1.5">
            <div className="relative h-20 w-20">
              <ScoreRing score={score.overall_score} size={80} />
              <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-[#0F0F0F]">
                {scoreNum}
              </span>
            </div>
            <span className="text-xs text-[#737373]">out of 100</span>
          </div>

          {/* Candidate info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-[#0F0F0F]">
                {resume.candidate_name ?? resume.original_filename}
              </h1>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Scored
              </span>
            </div>

            {resume.candidate_current_job && (
              <p className="text-sm text-[#404040] mb-0.5">{resume.candidate_current_job}</p>
            )}
            {resume.candidate_email && (
              <p className="text-xs text-[#737373] mb-0.5">{resume.candidate_email}</p>
            )}
            {resume.candidate_phone && (
              <p className="text-xs text-[#737373] mb-0.5">{resume.candidate_phone}</p>
            )}

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className={`text-sm font-semibold ${scoreColor(score.overall_score)}`}>
                {scoreLabel(score.overall_score)}
              </span>
              {resume.page_count && (
                <span className="text-xs text-[#A0A0A0]">{resume.page_count} pages</span>
              )}
              <span className="text-xs text-[#A0A0A0]">{formatDate(score.created_at)}</span>
              {score.rank && (
                <span className="text-xs text-[#A0A0A0]">Rank #{score.rank}</span>
              )}
            </div>
          </div>

          {/* View PDF button */}
          <button
            onClick={handleViewPdf}
            disabled={pdfLoading}
            className="shrink-0 h-9 px-4 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1a1a1a] transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {pdfLoading ? (
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 1v8M4 6l3 3 3-3" />
                <rect x="1" y="10" width="12" height="3" rx="1" />
              </svg>
            )}
            View PDF
          </button>
        </div>

        {/* Summary */}
        {score.overall_summary && (
          <p className="text-sm text-[#404040] leading-relaxed mt-4 pt-4 border-t border-[#E8E5DF]">
            {score.overall_summary}
          </p>
        )}
      </div>

      {/* AI Insights */}
      {((score.strengths && score.strengths.length > 0) ||
        (score.missing_elements && score.missing_elements.length > 0)) && (
        <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden mb-5">
          <div className="px-6 py-4 border-b border-[#E8E5DF]">
            <h2 className="text-sm font-semibold text-[#0F0F0F]">AI Insights</h2>
          </div>
          <div className="p-6 space-y-4">
            {score.strengths && score.strengths.length > 0 && (
              <InsightSection
                title="Strengths"
                items={score.strengths}
                color="green"
              />
            )}
            {score.missing_elements && score.missing_elements.length > 0 && (
              <InsightSection
                title="Missing Elements"
                items={score.missing_elements}
                color="red"
              />
            )}
          </div>
        </div>
      )}

      {/* Score Breakdown */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8E5DF]">
          <h2 className="text-sm font-semibold text-[#0F0F0F]">Score Breakdown</h2>
        </div>
        <div className="divide-y divide-[#E8E5DF]">
          {score.breakdown.map((cs, i) => (
            <CriterionCard key={i} cs={cs} />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Link
          to="/screenings/$id" params={{ id }}
          className="text-sm text-[#737373] hover:text-[#0F0F0F] inline-flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 7H3M7 3l-4 4 4 4" />
          </svg>
          Back to all candidates
        </Link>
      </div>
    </div>
  );
}


// --- Score Ring ---

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const stroke = score >= 75 ? "#16A34A" : score >= 50 ? "#D97706" : "#DC2626";

  return (
    <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E8E5DF" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={circ - fill} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}


// --- Insight Section ---

interface InsightSectionProps {
  title: string;
  items: string[];
  color: "green" | "red";
}

function InsightSection({ title, items, color }: InsightSectionProps) {
  const [open, setOpen] = useState(true);
  const styles = {
    green: {
      header: "bg-green-50 border-green-100",
      title: "text-green-800",
      dot: "bg-green-500",
      text: "text-green-900",
      icon: "text-green-600",
    },
    red: {
      header: "bg-red-50 border-red-100",
      title: "text-red-800",
      dot: "bg-red-500",
      text: "text-red-900",
      icon: "text-red-600",
    },
  }[color];

  return (
    <div className={`rounded-xl border ${styles.header} overflow-hidden`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 ${styles.header}`}
      >
        <span className={`text-sm font-semibold ${styles.title}`}>{title}</span>
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className={`${styles.icon} transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 5l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <ul className="px-4 pb-3 space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${styles.dot}`} />
              <span className={`text-sm leading-relaxed ${styles.text}`}>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


// --- Criterion Card ---

function CriterionCard({ cs }: { cs: { criterion: string; score: number; confidence: "high" | "medium" | "low"; evidence: string[]; explanation: string } }) {
  const [showEvidence, setShowEvidence] = useState(false);
  const pct = cs.score * 10;

  return (
    <div className="p-5">
      <div className="flex items-start gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-semibold text-[#0F0F0F]">{cs.criterion}</h3>
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${confidenceColor(cs.confidence)}`}>
              {cs.confidence}
            </span>
          </div>
          <p className="text-xs text-[#737373] leading-relaxed">{cs.explanation}</p>
        </div>

        {/* Score badge */}
        <div className="shrink-0 text-right">
          <span className={`text-xl font-bold ${scoreColor(pct)}`}>
            {cs.score}
            <span className="text-xs text-[#737373] font-normal">/10</span>
          </span>
          <div className="w-16 h-1.5 bg-[#E8E5DF] rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: pct >= 75 ? "#16A34A" : pct >= 50 ? "#D97706" : "#DC2626",
              }}
            />
          </div>
        </div>
      </div>

      {/* Evidence toggle */}
      {cs.evidence.length > 0 && (
        <button
          onClick={() => setShowEvidence((v) => !v)}
          className="text-xs text-[#737373] hover:text-[#0F0F0F] flex items-center gap-1 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 1a5 5 0 100 10A5 5 0 006 1zM6 5v2M6 8.5h.01" />
          </svg>
          {cs.evidence.length} evidence quote{cs.evidence.length > 1 ? "s" : ""}
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round"
            className={`transition-transform ${showEvidence ? "rotate-180" : ""}`}
          >
            <path d="M2 3.5l3 3 3-3" />
          </svg>
        </button>
      )}

      {showEvidence && cs.evidence.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {cs.evidence.map((quote, j) => (
            <blockquote
              key={j}
              className="border-l-2 border-[#C85A17] pl-3 text-xs text-[#404040] italic leading-relaxed"
            >
              &ldquo;{quote}&rdquo;
            </blockquote>
          ))}
        </div>
      )}
    </div>
  );
}
