import { useMemo, useState } from "react";
import { TONE_HEX, criterionTone } from "./scorecardUtils";

// Mirrors the resume-scoring breakdown shape: each criterion is scored /10 with
// supporting evidence quotes pulled from the transcript.
export interface VoiceBreakdownItem {
  category?: string | null;
  // criterion: string;
  question: string;
  score: number;
  confidence?: "high" | "medium" | "low" | null;
  evidence: string[];
  explanation: string;
}

export function isBreakdownItem(v: unknown): v is VoiceBreakdownItem {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as VoiceBreakdownItem).question === "string" &&
    typeof (v as VoiceBreakdownItem).score === "number"
  );
}

function CriterionRow({ item }: { item: VoiceBreakdownItem }) {
  const [open, setOpen] = useState(false);
  const tone = criterionTone(item.score);

  return (
    <div className="overflow-hidden rounded-lg border border-[#E8E5DF] bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[#F5F3EE]"
      >
        <span className="w-9 shrink-0 text-right text-sm font-bold tabular-nums" style={{ color: TONE_HEX[tone] }}>
          {item.score}
          <span className="text-[10px] font-normal text-[#A3A3A3]">/10</span>
        </span>
        <span
          className="h-6 w-0.5 shrink-0 rounded-full"
          style={{ backgroundColor: TONE_HEX[tone] }}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-[#0F0F0F]">{item.question}</span>
          {!open && item.explanation && (
            <span className="mt-0.5 block truncate text-[11px] text-[#737373]">{item.explanation}</span>
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
