import type { RubricCategory, Subcategory } from "@/types";
import { categoryColor, MAX_SUBCATEGORIES } from "@/lib/rubric";
import { CategoryImportancePills } from "./CategoryImportancePills";
import { SubcategoryRow } from "./SubcategoryRow";

interface RubricCategoryCardProps {
  category: RubricCategory;
  // Index into the category palette (0,1,2) for the accent colour.
  colorIndex: number;
  onWeightChange: (weight: number) => void;
  onSubcategoryChange: (subIdx: number, updates: Partial<Subcategory>) => void;
  onRemoveSubcategory: (subIdx: number) => void;
  onAddSubcategory: () => void;
}

// One coloured category card: header with importance pills, then its editable
// subcategory rows and an "add subcategory" affordance.
export function RubricCategoryCard({
  category,
  colorIndex,
  onWeightChange,
  onSubcategoryChange,
  onRemoveSubcategory,
  onAddSubcategory,
}: RubricCategoryCardProps) {
  const color = categoryColor(colorIndex);
  const atMax = category.subcategories.length >= MAX_SUBCATEGORIES;

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${color.border}`}>
      {/* Category header */}
      <div className={`px-5 py-4 ${color.bg} flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color.dot }} />
          <h3 className={`text-sm font-bold ${color.text} truncate`}>{category.name}</h3>
        </div>
        <CategoryImportancePills
          weight={category.weight}
          categoryName={category.name}
          onChange={onWeightChange}
        />
      </div>

      {/* Subcategories */}
      <div className="bg-white p-4 space-y-3">
        {category.subcategories.length === 0 && (
          <p className="text-xs text-[#A0A0A0] text-center py-3">No subcategories. Click below to add one.</p>
        )}

        {category.subcategories.map((sub, subIdx) => (
          <SubcategoryRow
            key={subIdx}
            subcategory={sub}
            onChange={(updates) => onSubcategoryChange(subIdx, updates)}
            onRemove={() => onRemoveSubcategory(subIdx)}
          />
        ))}

        {/* Add subcategory */}
        {atMax ? (
          <p className="text-xs text-[#A0A0A0] text-center pt-1">
            Maximum {MAX_SUBCATEGORIES} subcategories per category
          </p>
        ) : (
          <button
            onClick={onAddSubcategory}
            className="w-full mt-1 rounded-xl border border-dashed border-[#D4D4D4] hover:border-[#0F0F0F] hover:bg-[#FAFAF7] py-3 text-sm text-[#737373] hover:text-[#0F0F0F] flex items-center justify-center gap-1.5 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 1v10M1 6h10" /></svg>
            Add subcategory
          </button>
        )}
        <p className="text-xs text-[#A0A0A0] text-right pt-0.5">Importance is normalised during scoring</p>
      </div>
    </div>
  );
}
