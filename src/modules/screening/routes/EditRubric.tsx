import { useUndoRedo } from "@/hooks/useUndoRedo";
import { RubricHistoryControls } from "@/components/screening/RubricHistoryControls";
import { RubricCategoryTable } from "@/components/screening/RubricCategoryTable";
import { useAuth } from "@/hooks/useAuth";
import { readPendingRescore, markPendingRescoreReady, discardPendingRescore } from "@/modules/screening/utils/pendingRescore";
import { BackLink } from "@/components/layout/BackLink";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getScreening, updateRubric } from "@/lib/api";
import type { RubricCategory, Subcategory, Rubric, Screening } from "@/types";
import { truncate } from "@/lib/utils";
import { useAccount } from "@/hooks/useAccount";
import { MAX_SUBCATEGORIES } from "@/lib/rubric";

export default function EditRubric() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canWrite } = useAccount();
  const { user } = useAuth();
  const { rescoreAction } = useSearch({ strict: false }) as { rescoreAction?: string };
  const pendingRescore = readPendingRescore(rescoreAction, id, user?.id ?? "");
  const rescoreAfterSave = Boolean(pendingRescore && !pendingRescore.ready);
  const saveLabel = rescoreAfterSave ? "Save & rescore selected" : "Save rubric";
  const cancelEdit = () => {
    discardPendingRescore(rescoreAction);
    navigate({ to: "/screenings/$id", params: { id }, search: (prev) => ({ ...prev, rescoreAction: undefined }) });
  };

  const { data: screening, isLoading } = useQuery({
    queryKey: ["screening", id],
    queryFn: () => getScreening(id),
  });

  const initialCategories = useMemo<RubricCategory[]>(
    () => ((screening?.rubric as Rubric | null)?.categories ?? []),
    [screening],
  );

  const draftHistory = useUndoRedo<RubricCategory[]>([]);
  const { value: draft, set: setDraft, reset: resetDraft } = draftHistory;
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate draft once on first load. Avoid clobbering local edits if the
  // background screening refetch returns identical categories.
  useEffect(() => {
    if (!hydrated && initialCategories.length > 0) {
      resetDraft(deepClone(initialCategories));
      setHydrated(true);
    }
  }, [hydrated, initialCategories, resetDraft]);

  // const totalWeight = draft.reduce((s, c) => s + c.weight, 0);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initialCategories);
  const hasEmptySubName = draft.some((c) => c.subcategories.some((s) => !s.name.trim()));
  const canSave = canWrite && dirty && !hasEmptySubName && !saving;

  function updateSub(catIdx: number, subIdx: number, updates: Partial<Subcategory>) {
    setDraft((prev) =>
      prev.map((cat, ci) => {
        if (ci !== catIdx) return cat;
        const subs = cat.subcategories.map((s, si) => (si === subIdx ? { ...s, ...updates } : s));
        return { ...cat, subcategories: subs };
      }),
      `subcategory:${catIdx}:${subIdx}:${Object.keys(updates).sort().join(",")}`,
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
        if (cat.subcategories.length >= MAX_SUBCATEGORIES) return cat;
        return {
          ...cat,
          subcategories: [...cat.subcategories, { name: "", weight: 3, description: "" }],
        };
      }),
    );
  }

  async function handleSave() {
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

      // Publish the saved rubric before returning to start a pending rescore.
      queryClient.setQueryData(
        ["screening", id],
        (old: Screening | undefined) =>
          old ? { ...old, rubric: nextRubric } : old,
      );

      const ready = rescoreAfterSave && rescoreAction && user
        ? markPendingRescoreReady(rescoreAction, id, user.id)
        : false;
      navigate({
        to: "/screenings/$id",
        params: { id },
        search: (prev) => ({
          ...prev,
          saved: 1,
          tab: ready ? "Screening" : prev.tab,
          rescoreAction: ready ? rescoreAction : undefined,
        }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save rubric");
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
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <BackLink
          to="/screenings/$id"
          params={{ id }}
          search={{ tab: "Screening", rescoreAction }}
          label="screening"
          className="mb-1"
        />
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
              {rescoreAfterSave
                ? "Update the rubric, then save to re-score the selected candidates."
                : "Update the evaluation criteria and their importance, then save your rubric."}
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
      <fieldset disabled={saving || !canWrite} className="min-w-0" {...draftHistory.editorProps(canWrite && !saving)}>
      <RubricHistoryControls {...draftHistory} disabled={saving || !canWrite} />
      <div className="space-y-3">
        {draft.map((cat, catIdx) => (
          <RubricCategoryTable
            key={`${cat.name}-${catIdx}`}
            category={cat}
            colorIndex={catIdx}
            onSubcategoryChange={(subIdx, updates) => updateSub(catIdx, subIdx, updates)}
            onRemoveSubcategory={(subIdx) => removeSub(catIdx, subIdx)}
            onAddSubcategory={() => addSub(catIdx)}
          />
        ))}
      </div>

      </fieldset>

      {/* Footer actions */}
      <div className="sticky bottom-0 mt-6 -mx-8 px-8 py-4 bg-white/95 backdrop-blur border-t border-[#E8E5DF]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-[#737373]">
              {hasEmptySubName
                ? "Every subcategory needs a name."
                : dirty
                  ? "Ready to save."
                  : "No changes yet."}
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                disabled={saving}
                onClick={cancelEdit}
                className="h-10 px-4 text-sm font-medium text-[#404040] border border-[#D4D4D4] rounded-xl hover:bg-[#F5F3EE] flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              {canWrite && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave}
                  className="h-10 px-4 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : saveLabel}
                </button>
              )}
            </div>
          </div>
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
