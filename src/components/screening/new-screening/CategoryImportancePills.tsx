import { CATEGORY_PILLS, weightToCategoryPill } from "@/lib/rubric";

interface CategoryImportancePillsProps {
  // Stored 0–100 category weight; mapped to the active pill bucket.
  weight: number;
  // Used for the radiogroup accessible label.
  categoryName: string;
  // Fires with the bucket's representative weight when a pill is picked.
  onChange: (weight: number) => void;
}

// Category importance picker — replaces the 0-100 slider. The 4 buckets map to
// stored weights {10, 25, 50, 80}; the ranker normalises whatever values we
// send, so users pick semantically without doing math.
export function CategoryImportancePills({ weight, categoryName, onChange }: CategoryImportancePillsProps) {
  const activeKey = weightToCategoryPill(weight);
  return (
    <div
      className="flex items-center gap-1 p-0.5 rounded-full bg-white/70 border border-[#E8E5DF]"
      role="radiogroup"
      aria-label={`${categoryName} importance`}
    >
      {CATEGORY_PILLS.map((pill) => {
        const active = activeKey === pill.key;
        return (
          <button
            key={pill.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(pill.value)}
            className={`px-3 h-7 rounded-full text-xs font-semibold transition-colors ${
              active ? "bg-[#0F0F0F] text-white" : "text-[#737373] hover:text-[#0F0F0F] hover:bg-white"
            }`}
          >
            {pill.key}
          </button>
        );
      })}
    </div>
  );
}
