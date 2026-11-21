import { useId, useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import type { RubricCategory, Subcategory } from "@/types";
import {
  IMPORTANCE_LABELS,
  limitWords,
  MAX_DESCRIPTION_WORDS,
  MAX_SUBCATEGORIES,
  categoryColor,
} from "@/lib/rubric";

interface RubricCategoryTableProps {
  category: RubricCategory;
  colorIndex: number;
  onSubcategoryChange: (subIdx: number, updates: Partial<Subcategory>) => void;
  onRemoveSubcategory: (subIdx: number) => void;
  onAddSubcategory: () => void;
}

const EDITABLE_FIELD = "block w-full min-h-9 resize-none rounded-md border border-transparent bg-transparent py-1.5 pl-2.5 pr-8 text-sm leading-relaxed transition-colors placeholder:text-[#737373] hover:border-[#E8E5DF] hover:bg-[#FAFAF8] focus:border-[#C85A17] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C85A17]/20 [field-sizing:content]";
const EDIT_HINT = "pointer-events-none absolute right-2.5 top-3 text-[#A0A0A0] opacity-0 transition-opacity group-hover/field:opacity-100 group-focus-within/field:opacity-0 [@media(hover:none)]:opacity-100";

const TABLE_COLUMNS = "lg:grid-cols-[minmax(11rem,0.85fr)_minmax(24rem,2fr)_minmax(10rem,auto)_2.5rem]";

export function RubricCategoryTable({
  category,
  colorIndex,
  onSubcategoryChange,
  onRemoveSubcategory,
  onAddSubcategory,
}: RubricCategoryTableProps) {
  const [isOpen, setIsOpen] = useState(true);
  const id = useId();
  const color = categoryColor(colorIndex);
  const atMax = category.subcategories.length >= MAX_SUBCATEGORIES;

  return (
    <section className={`overflow-hidden rounded-xl border ${color.border}`}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={`${id}-table`}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${color.bg}`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color.dot }} />
          <span className={`truncate text-sm font-semibold ${color.text}`}>{category.name}</span>
        </span>
        <span className="ml-auto shrink-0 text-xs text-[#737373]">
          {category.subcategories.length}/{MAX_SUBCATEGORIES} criteria
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""} ${color.text}`}
        />
      </button>

      <div
        id={`${id}-table`}
        role="table"
        aria-label={`${category.name} rubric`}
        hidden={!isOpen}
        className="bg-white"
      >
          <div
            role="row"
            className={`hidden ${TABLE_COLUMNS} gap-2 border-b border-[#E8E5DF] bg-[#FAFAF8] px-3 py-2 text-xs font-semibold text-[#737373] lg:grid`}
          >
            <span role="columnheader">Title</span>
            <span role="columnheader">What to evaluate</span>
            <span role="columnheader">Importance</span>
            <span role="columnheader" className="sr-only">Actions</span>
          </div>

          {category.subcategories.map((subcategory, subIdx) => {
            const descriptionWordCount = (subcategory.description.match(/\S+/g) ?? []).length;
            return (
              <div
                key={subIdx}
                role="row"
                data-guide="rubric_subcategory"
                className={`grid grid-cols-1 ${TABLE_COLUMNS} items-start gap-2 border-b border-[#E8E5DF] px-3 py-3`}
              >
                <div role="cell" className="group/field min-w-0">
                  <label htmlFor={`${id}-title-${subIdx}`} className="mb-1 block text-xs font-medium text-[#737373] lg:sr-only">
                    Title
                  </label>
                  <div className="relative">
                  <textarea
                    id={`${id}-title-${subIdx}`}
                    value={subcategory.name}
                    onChange={(event) => onSubcategoryChange(subIdx, { name: event.target.value })}
                    placeholder="Click to add a title"
                    rows={1}
                    className={`${EDITABLE_FIELD} font-medium text-[#0F0F0F]`}
                  />
                  <Pencil size={13} aria-hidden="true" className={EDIT_HINT} />
                  </div>
                </div>

                <div role="cell" className="group/field min-w-0">
                  <label htmlFor={`${id}-description-${subIdx}`} className="mb-1 block text-xs font-medium text-[#737373] lg:sr-only">
                    What to evaluate
                  </label>
                  <div className="relative">
                  <textarea
                    id={`${id}-description-${subIdx}`}
                    value={subcategory.description}
                    onChange={(event) =>
                      onSubcategoryChange(subIdx, {
                        description: limitWords(event.target.value, MAX_DESCRIPTION_WORDS),
                      })
                    }
                    placeholder="Click to describe what to evaluate..."
                    rows={1}
                    aria-describedby={`${id}-count-${subIdx}`}
                    className={`${EDITABLE_FIELD} text-[#404040]`}
                  />
                  <Pencil size={13} aria-hidden="true" className={EDIT_HINT} />
                  </div>
                  <span
                    id={`${id}-count-${subIdx}`}
                    className={`mt-0.5 text-right text-[10px] leading-3 ${descriptionWordCount >= MAX_DESCRIPTION_WORDS - 15 ? "block text-[#A1440B]" : "hidden text-[#737373] group-focus-within/field:block"}`}
                  >
                    {descriptionWordCount}/{MAX_DESCRIPTION_WORDS} words
                  </span>
                </div>

                <div role="cell">
                  <span className="mb-1 block text-xs font-medium text-[#737373] lg:sr-only">Importance</span>
                  <div className="flex w-fit flex-col items-start gap-1 lg:pt-1.5">
                    <div
                      role="group"
                      aria-label={`Importance for ${subcategory.name || "subcategory"}`}
                      data-guide="rubric_subcategory_weight"
                      className="flex items-center gap-0.5 rounded-lg border border-[#E8E5DF] bg-[#FAFAF8] p-0.5"
                    >
                      {([1, 2, 3, 4, 5] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => onSubcategoryChange(subIdx, { weight: level })}
                          title={`Importance ${level}: ${IMPORTANCE_LABELS[level - 1]}`}
                          aria-label={`Importance ${level}: ${IMPORTANCE_LABELS[level - 1]}`}
                          aria-pressed={level === subcategory.weight}
                          className={`h-7 w-7 rounded-md border text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A17] ${level === subcategory.weight ? "border-[#0F0F0F] bg-[#0F0F0F] text-white" : "border-transparent bg-transparent text-[#737373] hover:bg-white hover:text-[#0F0F0F]"}`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                    <div className="w-full text-[10px] text-center leading-3 text-[#737373]">
                      {IMPORTANCE_LABELS[subcategory.weight - 1] ?? ""}
                    </div>
                  </div>
                </div>

                <div role="cell" className="flex justify-end lg:justify-center">
                  <button
                    type="button"
                    data-guide="rubric_subcategory_delete"
                    onClick={() => onRemoveSubcategory(subIdx)}
                    title="Delete subcategory"
                    aria-label={`Delete ${subcategory.name || "subcategory"}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-[#737373] transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A17]"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}

          {!atMax && (
          <div role="row" className="p-2">
              <div role="cell">
                <button
                  type="button"
                  data-guide="rubric_subcategory_add"
                  onClick={onAddSubcategory}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#D4D4D4] py-2 text-sm text-[#737373] transition-colors hover:border-[#0F0F0F] hover:bg-[#FAFAF7] hover:text-[#0F0F0F]"
                >
                  <Plus size={14} aria-hidden="true" />
                  Add subcategory
                </button>
              </div>
          </div>
          )}
          <div role="row">
            <p role="cell" className="px-3 pb-2 text-right text-[11px] text-[#A0A0A0]">
              Weights are normalised during scoring
            </p>
          </div>
      </div>
    </section>
  );
}
