import type { Subcategory } from "@/types";
import { IMPORTANCE_LABELS } from "@/lib/rubric";

interface SubcategoryRowProps {
  subcategory: Subcategory;
  onChange: (updates: Partial<Subcategory>) => void;
  onRemove: () => void;
}

// A single editable subcategory: name + description inputs, a 1–5 importance
// picker, and a delete button. "Must Have" / "External Signal" badges are
// read-only here — they reflect what the AI inferred from the JD.
export function SubcategoryRow({ subcategory: sub, onChange, onRemove }: SubcategoryRowProps) {
  return (
    <div className={`rounded-xl p-3.5 border ${sub.is_non_negotiable ? "border-red-300 bg-red-50/40" : "border-[#E8E5DF]"}`}>
      {/* Badges */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <button
          type="button"
          onClick={() => onChange({ is_non_negotiable: !sub.is_non_negotiable })}
          className={`flex flex-row items-center gap-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${sub.is_non_negotiable
            ? "bg-red-100 text-red-700 border-red-200"
            : "bg-white text-[#A0A0A0] border-[#E8E5DF] hover:border-red-200 hover:text-red-600"
            }`}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><polygon points="4,0 8,8 0,8" /></svg>
          Must Have
        </button>
        <button
          type="button"
          onClick={() => onChange({ is_external_context: !sub.is_external_context })}
          className={`text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${sub.is_external_context
            ? "bg-blue-50 text-blue-600 border-blue-200"
            : "bg-white text-[#A0A0A0] border-[#E8E5DF] hover:border-blue-200 hover:text-blue-600"
            }`}
        >
          External Signal
        </button>
      </div>

      {/* Mobile: stack inputs on top, weight+delete controls below (so the name
          input gets the full row width instead of being squeezed to ~90 px by
          the right-side cluster). sm+ keeps the original side-by-side. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Name input — pencil icon + bolder border makes it obvious this is
              a clickable field, not a static label. */}
          <div className="relative group">
            <input
              type="text"
              value={sub.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Subcategory name"
              disabled={sub.is_external_context}
              className="w-full text-sm font-medium text-[#0F0F0F] bg-[#FAFAF8] border border-[#D4D4D4] rounded-md pl-2.5 pr-7 py-1.5 hover:border-[#737373] hover:bg-white focus:border-[#C85A17] focus:bg-white focus:ring-1 focus:ring-[#C85A17]/20 focus:outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[#F5F4F1]"
            />
            {!sub.is_external_context && (
              <svg aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#0F0F0F] group-hover:text-[#0F0F0F] group-focus-within:text-[#C85A17] transition-colors" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 1.5L14.5 5 5 14.5 1.5 14.5 1.5 11z" />
                <path d="M9 3.5L12.5 7" />
              </svg>
            )}
          </div>
          {/* Description is a <textarea> not <input> so long text wraps to
              multiple lines on narrow viewports instead of being clipped after
              the visible width (~30-40 chars on a 320 px phone). rows=2 shows
              about a sentence; longer descriptions scroll internally. */}
          <div className="relative group">
            <textarea
              value={sub.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Brief description of what to evaluate..."
              rows={2}
              className="w-full text-xs text-[#737373] bg-[#FAFAF8] border border-[#D4D4D4] rounded-md pl-2.5 pr-7 py-1.5 hover:border-[#737373] hover:bg-white focus:border-[#C85A17] focus:bg-white focus:ring-1 focus:ring-[#C85A17]/20 focus:outline-none transition-colors resize-none"
            />
            <svg aria-hidden="true" className="pointer-events-none absolute right-2 top-2 text-[#0F0F0F] group-hover:text-[#0F0F0F] group-focus-within:text-[#C85A17] transition-colors" width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 1.5L14.5 5 5 14.5 1.5 14.5 1.5 11z" />
              <path d="M9 3.5L12.5 7" />
            </svg>
          </div>
        </div>
        {/* Importance 1-5 picker + delete. Mobile: full-width row below the
            inputs, weights left, X far right. sm+: original right-cluster. */}
        <div className="flex items-center justify-between gap-2 sm:justify-end sm:shrink-0">
          <div className="flex flex-col items-start sm:items-end gap-1">
            <div className="flex items-center gap-1">
              {([1, 2, 3, 4, 5] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => onChange({ weight: lvl })}
                  title={IMPORTANCE_LABELS[lvl - 1]}
                  className={`h-7 w-7 sm:h-6 sm:w-6 rounded-md text-xs font-bold transition-colors ${lvl <= sub.weight ? "bg-[#0F0F0F] text-white" : "bg-[#F0EDE8] text-[#A0A0A0] hover:bg-[#E8E5DF]"
                    }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-[#A0A0A0] font-medium">{IMPORTANCE_LABELS[sub.weight - 1] ?? ""}</span>
          </div>
          <button
            onClick={onRemove}
            title="Delete subcategory"
            className="h-9 w-9 sm:h-7 sm:w-7 rounded-lg border border-[#E8E5DF] text-[#737373] hover:text-red-600 hover:border-red-300 hover:bg-red-50 flex items-center justify-center transition-colors shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="sm:w-3 sm:h-3"><path d="M2 2l8 8M10 2l-8 8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
