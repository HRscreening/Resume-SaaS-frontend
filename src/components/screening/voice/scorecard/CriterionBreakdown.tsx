import { useMemo, useState } from "react";
import { TONE_HEX, criterionTone } from "./scorecardUtils";

// Mirrors the resume-scoring breakdown shape: each criterion is scored /10 with
// supporting evidence quotes pulled from the transcript.
export interface VoiceBreakdownItem {
  category?: string | null;
  criterion?: string;
  question: string;
  /** null when the question was declined or never asked — those produce no
   *  score at all, only missing evidence. */
  score: number | null;
  confidence?: "high" | "medium" | "low" | null;
  evidence: string[];
  explanation: string;
  /** Two-axis scoring (2026-08-16). Absent on scorecards produced before it. */
  status?: "answered" | "declined" | "not_asked";
  knowledge?: number;   // 0-3: do they understand it
  practice?: number;    // 0-3: have they personally done it
}

const STATUS_LABEL: Record<string, string> = {
  declined: "Declined to answer",
  not_asked: "Never asked",
};

/** Knowledge and practice are judged separately so the telling case is visible:
 *  fluent about a technology with no evidence of ever shipping it. A single
 *  number averages exactly that signal away. */
function AxisBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(3, value)) / 3;
  const tone = pct >= 0.67 ? TONE_HEX.positive : pct >= 0.34 ? TONE_HEX.caution : TONE_HEX.critical;
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#737373]">
        {label}
      </span>
      <span className="flex gap-0.5" aria-label={`${label} ${value} of 3`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-5 rounded-full"
            style={{ backgroundColor: i < value ? tone : "#E8E5DF" }}
          />
        ))}
      </span>
      <span className="text-[10px] tabular-nums text-[#A3A3A3]">{value}/3</span>
    </div>
  );
}

export function isBreakdownItem(v: unknown): v is VoiceBreakdownItem {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as VoiceBreakdownItem).question === "string" || typeof (v as VoiceBreakdownItem).criterion === "string" &&
    typeof (v as VoiceBreakdownItem).score === "number"
  );
}

function CriterionRow({ item }: { item: VoiceBreakdownItem }) {
  const [open, setOpen] = useState(false);
  // Unanswered questions have no score to colour; they read as neutral.
  const tone = criterionTone(item.score == null ? 5 : item.score / 10);

  return (
    <div className="overflow-hidden rounded-lg border border-[#E8E5DF] bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[#F5F3EE]"
      >
        <span className="w-9 shrink-0 text-right text-sm font-bold tabular-nums" style={{ color: TONE_HEX[tone] }}>
          {item.score == null ? (
            <span className="text-[#A3A3A3]">&mdash;</span>
          ) : (
            <>
              {Math.round(item.score)}
              <span className="text-[10px] font-normal text-[#A3A3A3]">/100</span>
            </>
          )}
        </span>
        <span
          className="h-6 w-0.5 shrink-0 rounded-full"
          style={{ backgroundColor: TONE_HEX[tone] }}
        />
        <span className="min-w-0 flex-1">
          {
          item.question 
          ? <span className="block text-xs font-medium text-[#0F0F0F]">{item.question}</span>
          : 
          item.criterion && <span className="block text-xs font-medium text-[#0F0F0F]">{item.criterion}</span>
          
          }
          {!open && item.status && item.status !== "answered" ? (
            <span className="mt-0.5 block text-[11px] font-medium text-amber-700">
              {STATUS_LABEL[item.status]}
            </span>
          ) : (
            !open && item.explanation && (
              <span className="mt-0.5 block truncate text-[11px] text-[#737373]">{item.explanation}</span>
            )
          )}
        </span>
        {item.confidence && (
          <span className="shrink-0 text-[10px] text-[#A3A3A3]">{item.confidence}</span>
        )}
        <svg
          width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round"
          className={`shrink-0 text-[#A3A3A3] transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 5l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className="space-y-2 border-t border-[#E8E5DF] px-3 pb-3 pt-2">
          {item.status === "answered" && item.knowledge != null && item.practice != null && (
            <div className="space-y-1.5 rounded-lg bg-[#FAFAF8] px-2.5 py-2">
              <AxisBar label="Knows" value={item.knowledge} />
              <AxisBar label="Has done" value={item.practice} />
              {item.knowledge >= 2 && item.practice <= 1 && (
                <p className="pt-0.5 text-[10px] leading-relaxed text-amber-700">
                  Talks about it confidently, but gave no evidence of doing it themselves.
                </p>
              )}
            </div>
          )}
          {item.explanation && (
            <p className="text-[11px] leading-relaxed text-[#404040]">{item.explanation}</p>
          )}
          {item.evidence.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#737373]">
                What they said
              </p>
              {item.evidence.map((quote, i) => (
                <blockquote
                  key={i}
                  className="border-l-2 border-[#C85A17] pl-2.5 text-[11px] italic leading-relaxed text-[#404040]"
                >
                  &ldquo;{quote}&rdquo;
                </blockquote>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Per-criterion detail, collapsed by default — this is the audit trail, not the headline. */
export function CriterionBreakdown({ items }: { items: VoiceBreakdownItem[] }) {
  // const [open, setOpen] = useState(false);

  // Preserve source order but cluster criteria under their category heading.
  const grouped = useMemo(() => {
    const out: { category: string; items: VoiceBreakdownItem[] }[] = [];
    for (const item of items) {
      const cat = item.category?.trim() || "Other";
      const bucket = out.find((g) => g.category === cat);
      if (bucket) bucket.items.push(item);
      else out.push({ category: cat, items: [item] });
    }
    return out;
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="w-full">
      <div className="text-xs font-semibold uppercase tracking-wide text-[#737373]">Score Breakdown</div>
        <div className="mt-2 space-y-3">
          {grouped.map((group) => (
            <div key={group.category} className="space-y-1.5">
              {group.items.map((item, i) => (
                <CriterionRow key={i} item={item} />
              ))}
            </div>
          ))}
        </div>
    </div>
  );
  // return (
  //   <div className="w-full flex-shrink-0">
  //     <button
  //       onClick={() => setOpen((v) => !v)}
  //       className="text-xs font-medium text-[#0F0F0F] underline underline-offset-2 hover:text-[#C85A17]"
  //     >
  //       {open ? "Hide criterion detail" : `Criterion detail and evidence (${items.length})`}
  //     </button>
  //     {open && (
  //       <div className="mt-2 space-y-3">
  //         {grouped.map((group) => (
  //           <div key={group.category} className="space-y-1.5">
  //             <p className="text-[10px] font-semibold uppercase tracking-wide text-[#737373]">
  //               {group.category}
  //             </p>
  //             {group.items.map((item, i) => (
  //               <CriterionRow key={i} item={item} />
  //             ))}
  //           </div>
  //         ))}
  //       </div>
  //     )}
  //   </div>
  // );
}
