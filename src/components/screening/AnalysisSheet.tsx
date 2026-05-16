import { useMemo, useState, useSyncExternalStore } from "react";
import { useParams } from "@tanstack/react-router";
import { Eye, EyeOff, ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCandidateScreeningDetail } from "@/controllers/screening/getCandidateScreeningDetail";
import { useScreening } from "@/controllers/screening/getScreening";
import { formatDate } from "@/lib/utils";

const sheetListeners = new Set<() => void>();
let openResumeId: string | null = null;
function subscribe(fn: () => void) {
  sheetListeners.add(fn);
  return () => sheetListeners.delete(fn);
}
function notify() {
  sheetListeners.forEach((fn) => fn());
}
function getSnapshot() {
  return openResumeId;
}
export function setOpenAnalysisSheet(resume_id: string | null) {
  if (openResumeId === resume_id) return;
  openResumeId = resume_id;
  notify();
}
export function toggleAnalysisSheet(resume_id: string) {
  setOpenAnalysisSheet(openResumeId === resume_id ? null : resume_id);
}
export function useAnalysisSheetOpenId(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
export function useAnalysisSheetOpen() {
  return useSyncExternalStore(subscribe, getSnapshot, () => null) !== null;
}
export const ANALYSIS_SHEET_WIDTH = 600;

type AnalysisSheetProps = {
  resume_id: string;
};

type BreakdownItem = {
  criterion: string;
  score: number;
  confidence: "high" | "medium" | "low";
  evidence: string[];
  explanation: string;
};

function getTierLabel(score: number) {
  if (score >= 75) return { label: "Strong Match", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", dot: "#22C55E" };
  if (score >= 55) return { label: "Potential",    color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200", dot: "#EAB308" };
  if (score >= 35) return { label: "Risky",        color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", dot: "#F97316" };
  return             { label: "Poor Fit",   color: "text-red-700",   bg: "bg-red-50",    border: "border-red-200",    dot: "#EF4444" };
}

function criterionBarColor(score: number) {
  if (score >= 7) return "#22C55E";
  if (score >= 4) return "#EAB308";
  return "#EF4444";
}

const AnalysisSheet = ({ resume_id }: AnalysisSheetProps) => {
  const { id: screening_id } = useParams({ strict: false }) as { id: string };
  const openId = useAnalysisSheetOpenId();
  const open = openId === resume_id;

  const handleOpenChange = (next: boolean) => {
    setOpenAnalysisSheet(next ? resume_id : null);
  };

  const {
    data,
    isLoading,
    isError,
    error,
  } = useCandidateScreeningDetail(screening_id, resume_id, { enabled: open });

  const { data: screening } = useScreening(screening_id, {
    enabled: open && !!data,
  });

  const nonNegotiableSet = useMemo(() => {
    const set = new Set<string>();
    screening?.rubric?.categories?.forEach((cat) =>
      cat.subcategories?.forEach((sub) => {
        if (sub.is_non_negotiable) set.add(sub.name);
      }),
    );
    return set;
  }, [screening]);

  const categoryScores = useMemo(() => {
    const cats = screening?.rubric?.categories ?? [];
    const breakdown = data?.score?.breakdown ?? [];
    return cats.map((cat) => {
      let weighted = 0;
      let totalW = 0;
      for (const sub of cat.subcategories ?? []) {
        const match = breakdown.find(
          (b) => b.criterion.toLowerCase().trim() === sub.name.toLowerCase().trim(),
        );
        if (match) {
          weighted += match.score * sub.weight;
          totalW += sub.weight;
        }
      }
      return {
        name: cat.name,
        weight: cat.weight,
        score: totalW > 0 ? weighted / totalW : null,
      };
    });
  }, [screening, data]);

  const resume = data;
  const score = data?.score ?? null;
  const initials = resume
    ? (resume.candidate_name ?? resume.original_filename).slice(0, 2).toUpperCase()
    : "—";
  const tier = score ? getTierLabel(score.overall_score) : null;


  
  return (
    <Sheet open={open} onOpenChange={handleOpenChange} modal={false}>
      <SheetTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenChange(!open);
          }}
          className="inline-flex items-center justify-center"
          aria-label={open ? "Hide analysis" : "View analysis"}
        >
          {open ? (
            <EyeOff className="text-[#C85A17]" size={16} />
          ) : (
            <Eye className="text-[#A0A0A0] hover:text-[#C85A17]" size={16} />
          )}
        </button>
      </SheetTrigger>

      <SheetContent
        showOverlay={false}
        onClick={(e) => e.stopPropagation()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="!max-w-[600px] overflow-y-auto p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-3 border-b border-[#E8E5DF]">
          <div className="flex items-center justify-between gap-3 mt-4">
            <SheetTitle className="text-sm font-semibold text-[#0F0F0F]">
              Candidate analysis
            </SheetTitle>
          </div>
          {tier && score && (
            <div className="mt-2 flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${tier.bg} ${tier.border} ${tier.color}`}
              >
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tier.dot }} />
                {Math.round(score.overall_score)} · {tier.label}
                {score.rank != null && (
                  <span className="text-[#737373] font-normal ml-1">#{score.rank}</span>
                )}
              </div>
            </div>
          )}
        </SheetHeader>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin" />
          </div>
        )}

        {/* Error */}
        {!isLoading && isError && (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-medium text-red-700">Failed to load analysis</p>
            <p className="text-xs text-[#737373] mt-1">
              {error instanceof Error ? error.message : "Something went wrong."}
            </p>
          </div>
        )}

        {/* No score yet */}
        {!isLoading && !isError && resume && !score && (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-[#404040]">Not yet scored.</p>
            <p className="text-xs text-[#737373] mt-1">
              This candidate hasn't been scored yet — check back once processing completes.
            </p>
          </div>
        )}

        {/* Content */}
        {!isLoading && !isError && resume && score && (
          <div className="px-6 py-6 space-y-5">
            {/* Candidate info */}
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-[#F0EDE8] border border-[#E8E5DF] flex items-center justify-center shrink-0">
                <span className="text-base font-bold text-[#404040]">{initials}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold text-[#0F0F0F] leading-tight">
                  {resume.candidate_name ?? resume.original_filename}
                </h1>
                {resume.candidate_current_job && (
                  <p className="text-sm text-[#404040] mt-0.5">{resume.candidate_current_job}</p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                  {resume.candidate_email && (
                    <a
                      href={`mailto:${resume.candidate_email}`}
                      className="text-xs text-[#737373] hover:text-[#0F0F0F]"
                    >
                      {resume.candidate_email}
                    </a>
                  )}
                  {resume.candidate_phone && (
                    <span className="text-xs text-[#737373]">{resume.candidate_phone}</span>
                  )}
                  {(resume as any).page_count && (
                    <span className="text-xs text-[#A0A0A0]">
                      {(resume as any).page_count}p resume
                    </span>
                  )}
                </div>
              </div>
              {screening_id && resume_id && (
                <a
                  href={`/screenings/${screening_id}/${resume_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-[#E8E5DF] text-xs font-medium text-[#404040] hover:bg-[#F5F3EE] transition-colors"
                  title="Open full page in new tab"
                >
                  <ExternalLink size={12} />
                  View Resume
                </a>
              )}
            </div>

            {/* Summary */}
            {score.overall_summary && (
              <div className="bg-[#F5F3EE] rounded-xl p-4">
                <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide mb-2">
                  AI Summary
                </p>
                <p className="text-sm text-[#404040] leading-relaxed">{score.overall_summary}</p>
              </div>
            )}

            {/* Category scores */}
            {categoryScores.some((c) => c.score !== null) && (
              <div>
                <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide mb-2.5">
                  Category Scores
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {categoryScores.map((cat) => (
                    <div
                      key={cat.name}
                      className="rounded-xl border border-[#E8E5DF] bg-white px-3 py-3 flex flex-col items-center text-center"
                    >
                      <p className="text-[10px] font-semibold text-[#737373] uppercase tracking-wide leading-tight">
                        {cat.name}
                      </p>
                      <p className="text-[10px] text-[#BDB8AE] mt-0.5">(out of 10)</p>
                      <p className="text-[10px] text-[#A0A0A0]">{cat.weight}%</p>
                      {cat.score !== null ? (
                        <>
                          <span className="text-base font-bold text-[#0F0F0F] mt-2 leading-none">
                            {cat.score.toFixed(1)}
                          </span>
                          <div className="w-14 h-1.5 bg-[#E8E5DF] rounded-full overflow-hidden mt-1.5">
                            <div
                              className="h-full rounded-full bg-[#C85A17]"
                              style={{ width: `${cat.score * 10}%` }}
                            />
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-[#D4D4D4] mt-2">--</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths + Missing */}
            {((score.strengths?.length ?? 0) > 0 || (score.missing_elements?.length ?? 0) > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {(score.strengths?.length ?? 0) > 0 && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-2.5">
                      Strengths
                    </p>
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
                    <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2.5">
                      Missing
                    </p>
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
              <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide mb-3">
                Criteria Breakdown
              </p>
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
                      cs={cs as BreakdownItem}
                      isNonNegotiable={nonNegotiableSet.has(cs.criterion)}
                    />
                  ))}
              </div>
            </div>

            <p className="text-xs text-[#A0A0A0] pb-2">
              Scored {formatDate(score.created_at)}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default AnalysisSheet;

function CriterionCard({
  cs,
  isNonNegotiable = false,
}: {
  cs: BreakdownItem;
  isNonNegotiable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pct = cs.score * 10;
  const barColor = criterionBarColor(cs.score);
  const failed = isNonNegotiable && cs.score < 4;

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
            {cs.score}
            <span className="text-xs text-[#A0A0A0] font-normal">/10</span>
          </span>
          <div className="w-14 h-1.5 bg-[#E8E5DF] rounded-full overflow-hidden mt-1">
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, backgroundColor: barColor }}
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[#0F0F0F] truncate">{cs.criterion}</span>
            {isNonNegotiable && (
              <span
                className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-semibold ${
                  failed ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                }`}
              >
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

        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
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
              <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide">
                Evidence
              </p>
              {cs.evidence.map((q, j) => (
                <blockquote
                  key={j}
                  className="border-l-2 border-[#C85A17] pl-3 text-xs text-[#404040] italic leading-relaxed"
                >
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
