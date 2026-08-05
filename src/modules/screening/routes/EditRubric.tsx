import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getScreening, getResults, updateRubric } from "@/lib/api";
import type { RubricCategory, Subcategory, Rubric, Screening } from "@/types";
import { truncate } from "@/lib/utils";
import { CategoryImportancePills } from "@/components/screening/new-screening/CategoryImportancePills";

const CATEGORY_COLORS = [
  { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "#3B82F6" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "#F59E0B" },
  { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", dot: "#8B5CF6" },
];

const IMPORTANCE_LABELS = ["Low", "Moderate", "Standard", "Important", "Critical"] as const;

export default function EditRubric() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: screening, isLoading } = useQuery({
    queryKey: ["screening", id],
    queryFn: () => getScreening(id),
  });

  // Only need the candidate count here, not the rows themselves — pull the
  // first page and rely on the server's `total` for the "re-score N candidates"
  // copy. Cheaper than fetching the whole list.
  const { data: resultsPage } = useQuery({
    queryKey: ["results", id, 1, 1],
    queryFn: () => getResults(id, { page: 1, page_size: 1 }),
    enabled: !!screening,
  });
  const candidatesCount = resultsPage?.total ?? 0;

  const initialCategories = useMemo<RubricCategory[]>(
    () => ((screening?.rubric as Rubric | null)?.categories ?? []),
    [screening],
  );

  const [draft, setDraft] = useState<RubricCategory[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate draft once on first load. Avoid clobbering local edits if the
  // background screening refetch returns identical categories.
  useEffect(() => {
    if (!hydrated && initialCategories.length > 0) {
      setDraft(deepClone(initialCategories));
      setHydrated(true);
    }
  }, [hydrated, initialCategories]);

  const totalWeight = draft.reduce((s, c) => s + c.weight, 0);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initialCategories);
  const hasEmptySubName = draft.some((c) => c.subcategories.some((s) => !s.name.trim()));
  const canSave = dirty && !hasEmptySubName && !saving;

  function updateCategoryWeight(catIdx: number, weight: number) {
    setDraft((prev) => prev.map((c, i) => (i === catIdx ? { ...c, weight } : c)));
  }



  function updateSub(catIdx: number, subIdx: number, updates: Partial<Subcategory>) {
    setDraft((prev) =>
      prev.map((cat, ci) => {
        if (ci !== catIdx) return cat;
        const subs = cat.subcategories.map((s, si) => (si === subIdx ? { ...s, ...updates } : s));
        return { ...cat, subcategories: subs };
      }),
    );
  }

  function removeSub(catIdx: number, subIdx: number) {
    setDraft((prev) =>
      prev.map((cat, ci) => {
        if (ci !== catIdx) return cat;
        return { ...cat, subcategories: cat.subcategories.filter((_, si) => si !== subIdx) };
      }),
    );
  }

  function addSub(catIdx: number) {
    setDraft((prev) =>
      prev.map((cat, ci) => {
        if (ci !== catIdx) return cat;
        if (cat.subcategories.length >= 5) return cat;
        return {
          ...cat,
          subcategories: [...cat.subcategories, { name: "", weight: 3, description: "" }],
        };
      }),
    );
  }

  async function handleConfirm() {
    if (!canSave || !screening) return;
    setSaving(true);
    setError(null);
    try {
      const existing = (screening.rubric as Rubric | null) ?? {
        threshold_score: 0,
        source: "MANUAL" as const,
        categories: [],
      };
      const nextRubric: Rubric = {
        ...existing,
        categories: draft,
        // Original AI rubric edited by the user becomes COMBINED;
        // a from-scratch manual rubric stays MANUAL.
        source: existing.source === "AI" ? "COMBINED" : existing.source,
      };

      await updateRubric(id, nextRubric);

      // Update the cached screening with the new rubric so the screening page
      // doesn't briefly show stale categories. Rescore is now an explicit
      // action the user takes from the screening page via the Rescore button.
      queryClient.setQueryData(
        ["screening", id],
        (old: Screening | undefined) =>
          old ? { ...old, rubric: nextRubric } : old,
      );

      navigate({
        to: "..",
        params: { id },
        search: (prev) => ({
          ...prev,
          saved: 1,
        }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save rubric");
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !screening) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="h-6 w-6 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 text-xs">
          <Link to="/screenings" className="text-[#737373] hover:text-[#0F0F0F]">Screenings</Link>
          <span className="text-[#D4D4D4]">/</span>
          <Link to="/screenings/$id" params={{ id }} className="text-[#737373] hover:text-[#0F0F0F]">
            {truncate(screening.title, 40)}
          </Link>
          <span className="text-[#D4D4D4]">/</span>
          <span className="text-[#404040]">Edit rubric</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F0F0F]">Edit scoring rubric</h1>
            <p className="text-sm text-[#737373] mt-1">
              Save your changes, then choose which of the <strong>{candidatesCount}</strong> candidates to re-score from the screening page.
            </p>
          </div>
          {/* <span
            className={`text-xs font-medium px-2.5 py-1 rounded-md self-start sm:shrink-0 ${totalWeight === 100 ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
              }`}
          >
            {totalWeight === 100 ? "Weights sum to 100%" : `Weights sum to ${totalWeight}% (must be 100)`}
          </span> */}
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Categories */}
      <div className="space-y-4">
        {draft.map((cat, catIdx) => {
          const color = CATEGORY_COLORS[catIdx] ?? CATEGORY_COLORS[0];
          return (
            <div key={`${cat.name}-${catIdx}`} className={`rounded-2xl border-2 overflow-hidden ${color.border}`}>
              <div className={`px-4 sm:px-5 py-4 ${color.bg} flex flex-wrap items-center justify-between gap-3`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color.dot }} />
                  <h3 className={`text-sm font-bold ${color.text} truncate`}>{cat.name}</h3>
                </div>
                <CategoryImportancePills
                  weight={cat.weight}
                  categoryName={cat.name}
                  onChange={(weight) => updateCategoryWeight(catIdx, weight)}
                />
              </div>

              <div className="bg-white p-4 space-y-3">
                {cat.subcategories.length === 0 && (
                  <p className="text-xs text-[#A0A0A0] text-center py-3">No subcategories. Click below to add one.</p>
                )}

                {cat.subcategories.map((sub, subIdx) => (
                  <div
                    key={subIdx}
                    className={`rounded-xl p-3.5 border ${sub.is_non_negotiable ? "border-red-300 bg-red-50/40" : "border-[#E8E5DF]"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => updateSub(catIdx, subIdx, { is_non_negotiable: !sub.is_non_negotiable })}
                        className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border transition-colors ${sub.is_non_negotiable
                          ? "bg-red-100 text-red-700 border-red-200"
                          : "bg-white text-[#A0A0A0] border-[#E8E5DF] hover:border-red-200 hover:text-red-600"
                          }`}
                      >
                        Must Have
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSub(catIdx, subIdx, { is_external_context: !sub.is_external_context })}
                        className={`text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border transition-colors ${sub.is_external_context
                          ? "bg-blue-50 text-blue-600 border-blue-200"
                          : "bg-white text-[#A0A0A0] border-[#E8E5DF] hover:border-blue-200 hover:text-blue-600"
                          }`}
                      >
                        External Signal
                      </button>
                    </div>
                    {/* Mobile: stack inputs / controls vertically so the name
                        input gets full row width. sm+ keeps the side-by-side
                        layout. */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <input
                          type="text"
                          value={sub.name}
                          onChange={(e) => updateSub(catIdx, subIdx, { name: e.target.value })}
                          placeholder="Subcategory name"
                          disabled={sub.is_external_context}
                          className="w-full text-sm font-medium text-[#0F0F0F] bg-white border border-[#E8E5DF] rounded-md px-2.5 py-1.5 hover:border-[#A0A0A0] focus:border-[#C85A17] focus:ring-1 focus:ring-[#C85A17]/20 focus:outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[#F5F4F1]"
                        />
                        {/* Multi-line so long descriptions wrap rather than
                            being clipped on narrow viewports — single-line
                            <input> truncated values like 'Hands-on experience
                            with Docker, K…' on a 320 px screen. */}
                        <textarea
                          value={sub.description}
                          onChange={(e) => updateSub(catIdx, subIdx, { description: e.target.value })}
                          placeholder="Brief description of what to evaluate..."
                          rows={2}
                          className="w-full text-xs text-[#737373] bg-white border border-[#E8E5DF] rounded-md px-2.5 py-1.5 hover:border-[#A0A0A0] focus:border-[#C85A17] focus:ring-1 focus:ring-[#C85A17]/20 focus:outline-none transition-colors resize-none"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 sm:justify-end sm:shrink-0">
                        <div className="flex flex-col items-start sm:items-end gap-1">
                          <div className="flex items-center gap-1">
                            {([1, 2, 3, 4, 5] as const).map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => updateSub(catIdx, subIdx, { weight: lvl })}
                                title={IMPORTANCE_LABELS[lvl - 1]}
                                className={`h-7 w-7 sm:h-6 sm:w-6 rounded-md text-xs font-bold transition-colors ${lvl <= sub.weight
                                  ? "bg-[#0F0F0F] text-white"
                                  : "bg-[#F0EDE8] text-[#A0A0A0] hover:bg-[#E8E5DF]"
                                  }`}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                          <span className="text-[10px] text-[#A0A0A0] font-medium">
                            {IMPORTANCE_LABELS[sub.weight - 1] ?? ""}
                          </span>
                        </div>
                        <button
                          onClick={() => removeSub(catIdx, subIdx)}
                          title="Delete subcategory"
                          className="h-9 w-9 sm:h-7 sm:w-7 rounded-lg border border-[#E8E5DF] text-[#737373] hover:text-red-600 hover:border-red-300 hover:bg-red-50 flex items-center justify-center transition-colors shrink-0"
                        >
                          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="sm:w-3 sm:h-3">
                            <path d="M2 2l8 8M10 2l-8 8" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {cat.subcategories.length < 5 ? (
                  <button
                    onClick={() => addSub(catIdx)}
                    className="w-full mt-1 rounded-xl border border-dashed border-[#D4D4D4] hover:border-[#0F0F0F] hover:bg-[#FAFAF7] py-3 text-sm text-[#737373] hover:text-[#0F0F0F] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M6 1v10M1 6h10" />
                    </svg>
                    Add subcategory
                  </button>
                ) : (
                  <p className="text-xs text-[#A0A0A0] text-center pt-1">Maximum 5 subcategories per category</p>
                )}
                <p className="text-xs text-[#A0A0A0] text-right pt-0.5">Importance is normalised during scoring</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="sticky bottom-0 mt-6 -mx-8 px-8 py-4 bg-white/95 backdrop-blur border-t border-[#E8E5DF]">
        {confirmOpen ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-[#404040]">
              Save the updated rubric? Existing scores stay until you re-score from the screening page.
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
                className="h-10 px-4 text-sm font-medium text-[#404040] border border-[#D4D4D4] rounded-xl hover:bg-[#F5F3EE] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="h-10 px-4 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 flex items-center gap-2"
              >
                {saving && <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                {saving ? "Saving…" : "Save rubric"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-[#737373]">
              {hasEmptySubName
                ? "Every subcategory needs a name."
                : dirty
                  ? "Ready to save."
                  : "No changes yet."}
            </p>
            <div className="flex gap-2 shrink-0">
              <div
                onClick={() => navigate({ to: "..", params: { id }, search: (prev) => prev })}
                className="h-10 px-4 text-sm font-medium text-[#404040] border border-[#D4D4D4] rounded-xl hover:bg-[#F5F3EE] flex items-center"
              >
                Cancel
              </div>
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={!canSave}
                className="h-10 px-4 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Save rubric
              </button>
            </div>
          </div>
        )}
      </div>
    </div >
  );
}

function deepClone(categories: RubricCategory[]): RubricCategory[] {
  return categories.map((c) => ({
    ...c,
    subcategories: c.subcategories.map((s) => ({ ...s })),
  }));
}
