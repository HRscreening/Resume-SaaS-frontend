import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCallScorecard } from "@/lib/api";
import type { CallScorecardDetail } from "@/types";

interface VoiceScorecardDetailsProps {
  screeningId: string;
  callId: string;
}

// The voice scorecard reuses the resume-scoring breakdown shape: each criterion
// is scored /10 with supporting evidence quotes. `category` groups criteria
// (Technical Skills, Experience & Impact, …); `confidence` is the model's own
// certainty in that criterion's judgement.
interface VoiceBreakdownItem {
  category?: string | null;
  criterion: string;
  score: number;
  confidence?: "high" | "medium" | "low" | null;
  evidence: string[];
  explanation: string;
}

function recommendationChip(rec: string | null): { label: string; cls: string } {
  switch ((rec ?? "").toLowerCase()) {
    case "advance": return { label: "Advance", cls: "bg-green-100 text-green-800 border-green-200" };
    case "hold": return { label: "Hold", cls: "bg-amber-100 text-amber-800 border-amber-200" };
    case "reject": return { label: "Reject", cls: "bg-red-100 text-red-700 border-red-200" };
    default: return { label: rec ?? "—", cls: "bg-slate-100 text-slate-700 border-slate-200" };
  }
}

function verdictChip(v: string | undefined): { label: string; cls: string } {
  switch (v) {
    case "qualified": return { label: "Qualified", cls: "bg-green-100 text-green-800 border-green-200" };
    case "needs_review": return { label: "Needs review", cls: "bg-amber-100 text-amber-800 border-amber-200" };
    case "not_a_fit": return { label: "Not a fit", cls: "bg-red-100 text-red-700 border-red-200" };
    default: return { label: v ?? "—", cls: "bg-slate-100 text-slate-700 border-slate-200" };
  }
}

function barColor(score: number): string {
  if (score >= 7) return "#22C55E";
  if (score >= 4) return "#EAB308";
  return "#EF4444";
}

function humanizeFlag(flag: string): string {
  return flag.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isBreakdownItem(v: unknown): v is VoiceBreakdownItem {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as VoiceBreakdownItem).criterion === "string" &&
    typeof (v as VoiceBreakdownItem).score === "number"
  );
}

/**
 * Full voice-interview scorecard shown once a call is completed: the AI summary,
 * strengths / concerns, flags, and the per-criterion breakdown with evidence.
 * Mirrors the resume scorecard's visual language (score /10, expandable
 * criterion cards, evidence blockquotes) so the two feel like one product.
 * Fetched on demand — this only mounts for a completed call.
 */
export function VoiceScorecardDetails({ screeningId, callId }: VoiceScorecardDetailsProps) {
  const { data, isLoading, isError } = useQuery<CallScorecardDetail>({
    queryKey: ["call-scorecard", screeningId, callId],
    queryFn: () => getCallScorecard(screeningId, callId),
    staleTime: 60_000,
  });

  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const breakdown = useMemo<VoiceBreakdownItem[]>(
    () => (data?.breakdown ?? []).filter(isBreakdownItem),
    [data],
  );

  // Preserve source order but cluster criteria under their category heading.
  const grouped = useMemo<{ category: string; items: VoiceBreakdownItem[] }[]>(() => {
    const out: { category: string; items: VoiceBreakdownItem[] }[] = [];
    for (const item of breakdown) {
      const cat = item.category?.trim() || "Other";
      const bucket = out.find((g) => g.category === cat);
      if (bucket) bucket.items.push(item);
      else out.push({ category: cat, items: [item] });
    }
    return out;
  }, [breakdown]);

  if (isLoading) {
    return <p className="text-xs text-[#737373]">Loading interview results…</p>;
  }
  if (isError || !data) {
    return <p className="text-xs text-[#737373]">Could not load the interview results.</p>;
  }

  const q = data.qualification;
  if (q) {
    const chip = verdictChip(q.verdict);
    const f = q.facts;
    const row = (label: string, value: ReactNode) => (
      <div className="flex items-center justify-between gap-3 py-1 text-xs">
        <span className="text-[#737373]">{label}</span>
        <span className="text-[#0F0F0F] font-medium text-right">{value ?? "—"}</span>
      </div>
    );
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md border ${chip.cls}`}>{chip.label}</span>
          {q.verdict_reason && <span className="text-[11px] text-[#737373]">{q.verdict_reason}</span>}
        </div>

        <div className="rounded-xl bg-[#F5F3EE] p-3">
          <p className="text-[10px] font-semibold text-[#737373] uppercase tracking-wide mb-1.5">Captured</p>
          {row("Current CTC", f.current_ctc)}
          {row("Expected CTC", f.expected_ctc
            ? <span>{f.expected_ctc}{f.ctc_in_band === false && <span className="ml-1 text-red-600">over band</span>}{f.ctc_in_band === true && <span className="ml-1 text-green-700">in band</span>}</span>
            : null)}
          {row("Notice period", f.notice_period)}
          {row("Location", f.candidate_location)}
          {row("Relocation", f.relocation_willing == null ? null : (f.relocation_willing ? "Willing" : "Not willing"))}
        </div>

        {q.interest_summary && (
          <div className="rounded-xl bg-[#F5F3EE] p-3">
            <p className="text-[10px] font-semibold text-[#737373] uppercase tracking-wide mb-1.5">Interest & motivation</p>
            <p className="text-xs text-[#404040] leading-relaxed">{q.interest_summary}</p>
          </div>
        )}

        {q.role_read.length > 0 && (
          <div className="rounded-xl bg-[#F5F3EE] p-3">
            <p className="text-[10px] font-semibold text-[#737373] uppercase tracking-wide mb-1.5">Role read</p>
            <ul className="list-disc pl-4 text-xs text-[#404040] space-y-0.5">
              {q.role_read.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        {q.flags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {q.flags.map((fl, i) => (
              <span key={i} className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800">{fl}</span>
            ))}
          </div>
        )}

        {q.reschedule_requested && (
          <p className="text-[11px] text-[#737373]">Requested callback: {q.reschedule_requested}</p>
        )}

        {data.transcript && data.transcript.length > 0 && (
          <details className="rounded-xl bg-[#F5F3EE] p-3">
            <summary className="text-[10px] font-semibold text-[#737373] uppercase tracking-wide cursor-pointer">Transcript</summary>
            <div className="mt-2 space-y-1">
              {data.transcript.map((t, i) => (
                <p key={i} className="text-xs"><span className="font-semibold text-[#737373]">{t.speaker === "candidate" ? "Candidate" : "Agent"}:</span> <span className="text-[#404040]">{t.text}</span></p>
              ))}
            </div>
          </details>
        )}
      </div>
    );
  }

  const rec = recommendationChip(data.recommendation);
  const strengths = data.strengths ?? [];
  const missing = data.missing_elements ?? [];
  const flags = data.flags ?? [];

  return (
    <div className="space-y-3">
      {/* Recommendation + partial marker */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md border ${rec.cls}`}>
          {rec.label}
        </span>
        {data.is_partial && (
          <span className="text-[11px] text-amber-700">partial interview</span>
        )}
      </div>

      {/* AI summary */}
      {data.overall_summary && (
        <div className="rounded-xl bg-[#F5F3EE] p-3">
          <p className="text-[10px] font-semibold text-[#737373] uppercase tracking-wide mb-1.5">
            Interview summary
          </p>
          <p className="text-xs text-[#404040] leading-relaxed">{data.overall_summary}</p>
        </div>
      )}

      {/* Why this score */}
      {data.score_drivers && (
        <div className="rounded-xl bg-[#F5F3EE] p-3 space-y-2.5">
          <p className="text-[10px] font-semibold text-[#737373] uppercase tracking-wide">
            Why this score
          </p>

          {/* Per-category rows */}
          <div className="space-y-1.5">
            {data.score_drivers.categories.map((cat, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex-1 min-w-0 text-xs text-[#0F0F0F] font-medium truncate">{cat.name}</span>
                <span className="text-[11px] text-[#737373] shrink-0">{cat.weight_pct}%</span>
                <span className="text-[11px] text-[#404040] shrink-0">{cat.avg_score.toFixed(1)}/10</span>
                <span
                  className={`text-[11px] font-semibold shrink-0 w-14 text-right ${
                    cat.direction === "positive"
                      ? "text-green-700"
                      : cat.direction === "negative"
                      ? "text-red-600"
                      : "text-[#737373]"
                  }`}
                >
                  {cat.delta_points >= 0 ? "+" : ""}{cat.delta_points.toFixed(1)}pt
                </span>
              </div>
            ))}
          </div>

          {/* Driver chips */}
          {(data.score_drivers.positive_drivers.length > 0 || data.score_drivers.negative_drivers.length > 0) && (
            <div className="space-y-1.5 pt-1 border-t border-[#E8E5DF]">
              {data.score_drivers.positive_drivers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {data.score_drivers.positive_drivers.map((d, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-green-50 border border-green-200 text-green-800"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                      {d.criterion}
                      <span className="font-semibold">{d.score}/10</span>
                    </span>
                  ))}
                </div>
              )}
              {data.score_drivers.negative_drivers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {data.score_drivers.negative_drivers.map((d, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-700"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                      {d.criterion}
                      <span className="font-semibold">{d.score}/10</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Strengths / Concerns */}
      {(strengths.length > 0 || missing.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {strengths.length > 0 && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-green-800 uppercase tracking-wide mb-2">
                Strengths
              </p>
              <ul className="space-y-1.5">
                {strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-green-900">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {missing.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-red-700 uppercase tracking-wide mb-2">
                Concerns
              </p>
              <ul className="space-y-1.5">
                {missing.map((s, i) => (
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

      {/* Flags */}
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {flags.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {humanizeFlag(f)}
            </span>
          ))}
        </div>
      )}

      {/* Criteria breakdown (progressive disclosure) */}
      {breakdown.length > 0 && (
        <div>
          <button
            onClick={() => setShowBreakdown((v) => !v)}
            className="text-xs font-medium text-[#0F0F0F] underline"
          >
            {showBreakdown ? "Hide score breakdown" : `View score breakdown (${breakdown.length})`}
          </button>
          {showBreakdown && (
            <div className="mt-2 space-y-3">
              {grouped.map((group) => (
                <div key={group.category} className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-[#737373] uppercase tracking-wide">
                    {group.category}
                  </p>
                  <div className="space-y-1.5">
                    {group.items.map((cs, i) => (
                      <CriterionRow key={i} cs={cs} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transcript (on demand) */}
      <div>
        <button
          onClick={() => setShowTranscript((v) => !v)}
          className="text-xs font-medium text-[#0F0F0F] underline"
        >
          {showTranscript ? "Hide transcript" : "View transcript"}
        </button>
        {showTranscript && (
          <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-[#E8E5DF] bg-white p-3 space-y-2">
            {(!data.transcript || data.transcript.length === 0) && (
              <p className="text-xs text-[#737373]">No transcript available for this call.</p>
            )}
            {data.transcript?.map((t, i) => (
              <div key={i} className="text-xs">
                <span className={`font-semibold ${t.speaker === "agent" ? "text-[#C85A17]" : "text-[#0F0F0F]"}`}>
                  {t.speaker === "agent" ? "AI" : "Candidate"}:
                </span>{" "}
                <span className="text-[#404040]">{t.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CriterionRow({ cs }: { cs: VoiceBreakdownItem }) {
  const [open, setOpen] = useState(false);
  const pct = Math.max(0, Math.min(100, cs.score * 10));

  return (
    <div className="border border-[#E8E5DF] rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-black/5 transition-colors"
      >
        <div className="shrink-0 w-12">
          <span className="text-xs font-bold text-[#0F0F0F]">
            {cs.score}
            <span className="text-[10px] text-[#A0A0A0] font-normal">/10</span>
          </span>
          <div className="w-12 h-1.5 bg-[#E8E5DF] rounded-full overflow-hidden mt-1">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor(cs.score) }} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-[#0F0F0F]">{cs.criterion}</span>
            {cs.confidence && (
              <span className="text-[10px] text-[#A0A0A0]">· {cs.confidence} confidence</span>
            )}
          </div>
          {!open && cs.explanation && (
            <p className="text-[11px] text-[#737373] truncate mt-0.5">{cs.explanation}</p>
          )}
        </div>
        <svg
          width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round"
          className={`shrink-0 text-[#A0A0A0] transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 5l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-[#E8E5DF] pt-2 space-y-2">
          {cs.explanation && (
            <p className="text-[11px] text-[#404040] leading-relaxed">{cs.explanation}</p>
          )}
          {cs.evidence.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-[#737373] uppercase tracking-wide">Evidence</p>
              {cs.evidence.map((q, j) => (
                <blockquote
                  key={j}
                  className="border-l-2 border-[#C85A17] pl-2.5 text-[11px] text-[#404040] italic leading-relaxed"
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
