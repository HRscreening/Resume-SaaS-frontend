import { useId } from "react";
import { X } from "lucide-react";
import type { Subcategory } from "@/types";
import { IMPORTANCE_LABELS } from "@/lib/rubric";

interface SubcategoryRowProps {
  subcategory: Subcategory;
  onChange: (updates: Partial<Subcategory>) => void;
  onRemove: () => void;
}

export function SubcategoryRow({ subcategory: sub, onChange, onRemove }: SubcategoryRowProps) {
  const id = useId();
  return (
    <div
      data-guide="rubric_subcategory"
      className="flex h-full min-w-0 flex-col rounded-xl border border-[#E8E5DF] bg-[#FAFAF8] p-4"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={`${id}-name`} className="text-xs font-medium text-[#737373]">Subcategory</label>
        <button
          type="button"
          data-guide="rubric_subcategory_delete"
          onClick={onRemove}
          title="Delete subcategory"
          aria-label={`Delete ${sub.name || "subcategory"}`}
          className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#737373] transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A17]"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <textarea
        id={`${id}-name`}
        value={sub.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Subcategory name"
        rows={2}
        className="w-full resize-none rounded-lg border border-[#D4D4D4] bg-white px-3 py-2 text-sm font-medium leading-relaxed text-[#0F0F0F] focus:border-[#C85A17] focus:outline-none focus:ring-1 focus:ring-[#C85A17]/20 [field-sizing:content]"
      />
      <label htmlFor={`${id}-description`} className="mb-1.5 mt-3 text-xs font-medium text-[#737373]">What to evaluate</label>
      <textarea
        id={`${id}-description`}
        value={sub.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Describe what to evaluate..."
        rows={3}
        className="mb-4 min-h-24 w-full flex-1 resize-y rounded-lg border border-[#D4D4D4] bg-white px-3 py-2 text-xs leading-relaxed text-[#404040] focus:border-[#C85A17] focus:outline-none focus:ring-1 focus:ring-[#C85A17]/20"
      />
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#E8E5DF] pt-3">
        <div>
          <span id={`${id}-weight`} className="block text-xs font-medium text-[#404040]">Weight (1–5)</span>
          <span className="mt-0.5 block text-[11px] text-[#737373]">{IMPORTANCE_LABELS[sub.weight - 1] ?? ""}</span>
        </div>
        <div role="group" aria-labelledby={`${id}-weight`} data-guide="rubric_subcategory_weight" className="flex items-center gap-1">
          {([1, 2, 3, 4, 5] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onChange({ weight: level })}
              title={`Weight ${level}: ${IMPORTANCE_LABELS[level - 1]}`}
              aria-label={`Weight ${level}: ${IMPORTANCE_LABELS[level - 1]}`}
              aria-pressed={level === sub.weight}
              className={`h-8 w-8 rounded-lg border text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A17] ${level === sub.weight ? "border-[#0F0F0F] bg-[#0F0F0F] text-white" : "border-[#E8E5DF] bg-white text-[#737373] hover:border-[#A0A0A0] hover:text-[#0F0F0F]"}`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
