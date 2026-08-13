import type { RubricCategory } from "@/types";
import { CategoryImportancePillsViewOnly } from "@/components/screening/new-screening/CategoryImportancePills";

interface RubricModalProps {
  categories: RubricCategory[];
  onClose: () => void;
  onEdit?: () => void;
}

export function RubricModal({ categories, onClose, onEdit }: RubricModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-[#E8E5DF] max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-[#E8E5DF] flex items-center justify-between z-10">
          <h2 className="text-base font-semibold text-[#0F0F0F]">Scoring Rubric</h2>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="h-8 px-3 text-xs font-medium border border-[#D4D4D4] rounded-lg text-[#404040] hover:bg-[#F5F3EE] flex items-center gap-1.5"
              >
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1.5 12.5h11M9 2l3 3-7.5 7.5H1.5V9.5L9 2z" />
                </svg>
                Edit
              </button>
            )}
            <button onClick={onClose} className="h-7 w-7 rounded-lg hover:bg-[#F5F3EE] flex items-center justify-center text-[#737373]">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {categories.map((cat,index) => (
            <div key={cat.name} className="border border-[#E8E5DF] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-[#F5F3EE] flex items-center justify-between">
                <span className="text-sm font-semibold text-[#0F0F0F]">{cat.name}</span>
                {/* <CategoryImportancePillsViewOnly weight={cat.weight} categoryName={cat.name} key={index}/> */}
              </div>
              {cat.subcategories.length > 0 && (
                <div className="divide-y divide-[#E8E5DF]">
                  {cat.subcategories.map((sub) => (
                    <div key={sub.name} className="px-4 py-2.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-[#0F0F0F]">{sub.name}</p>
                          {sub.is_non_negotiable && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-red-100 text-red-700">Must Have</span>
                          )}
                          {sub.is_external_context && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-100 text-blue-700">External Signal</span>
                          )}
                        </div>
                        <p className="text-xs text-[#737373] mt-0.5">{sub.description}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((lvl) => (
                            <div
                              key={lvl}
                              title={["Low", "Moderate", "Standard", "Important", "Critical"][lvl - 1]}
                              className={`h-5 w-5 rounded-md text-[10px] font-bold flex items-center justify-center ${
                                lvl <= sub.weight
                                  ? "bg-[#0F0F0F] text-white"
                                  : "bg-[#F0EDE8] text-[#A0A0A0]"
                              }`}
                            >
                              {lvl}
                            </div>
                          ))}
                        </div>
                        <span className="text-[10px] text-[#A0A0A0] font-medium">
                          {["Low", "Moderate", "Standard", "Important", "Critical"][sub.weight - 1] ?? ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
