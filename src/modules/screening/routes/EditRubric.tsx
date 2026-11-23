import { useRubricEditor } from "@/hooks/useRubricEditor";
import { RubricToolbar } from "@/components/screening/RubricToolbar";
import { RubricCategoryTable } from "@/components/screening/RubricCategoryTable";
import { useAuth } from "@/hooks/useAuth";
import { readPendingRescore, markPendingRescoreReady, discardPendingRescore } from "@/modules/screening/utils/pendingRescore";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useRouter, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getScreening, updateRubric } from "@/lib/api";
import type { Rubric, Screening } from "@/types";
import { useAccount } from "@/hooks/useAccount";

export default function EditRubric() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canWrite } = useAccount();
  const { user } = useAuth();
  const { rescoreAction } = useSearch({ strict: false }) as { rescoreAction?: string };
  const pendingRescore = readPendingRescore(rescoreAction, id, user?.id ?? "");
  const rescoreAfterSave = Boolean(pendingRescore && !pendingRescore.ready);
  const saveLabel = rescoreAfterSave ? "Save & rescore selected" : "Save rubric";
  const cancelEdit = () => {
    discardPendingRescore(rescoreAction);
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      navigate({ to: "/screenings/$id", params: { id }, search: (prev) => ({ ...prev, rescoreAction: undefined }) });
    }
  };

  const { data: screening, isLoading } = useQuery({
    queryKey: ["screening", id],
    queryFn: () => getScreening(id),
  });

  const editor = useRubricEditor();
  const { rubric, reset, dirty, validationError } = editor;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load once; background refetches must not overwrite unsaved edits.
  useEffect(() => {
    if (!rubric && screening?.rubric) reset(screening.rubric as Rubric);
  }, [rubric, screening?.rubric, reset]);

  const canSave = canWrite && dirty && Boolean(rubric) && !saving;

  async function handleSave() {
    if (!canSave || !screening) return;
    const validRubric = editor.validateForSave();
    if (!validRubric) return;
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
        categories: validRubric.categories,
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
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto" {...editor.editorProps(canWrite && !saving)}>
      <header className="mb-4 flex min-w-0 items-center gap-3">
        <h1 className="shrink-0 text-lg font-semibold text-[#0F0F0F]">Edit rubric</h1>
        <span aria-hidden="true" className="h-4 w-px shrink-0 bg-[#D4D4D4]" />
        <Link
          to="/screenings/$id"
          params={{ id }}
          title={screening.title}
          className="min-w-0 truncate text-sm text-[#737373] hover:text-[#0F0F0F]"
        >
          {screening.title}
        </Link>
      </header>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Categories */}
      <fieldset disabled={saving || !canWrite} className="min-w-0">
        <div className="space-y-3">
          {editor.categories.map((category, index) => (
            <RubricCategoryTable key={`${category.name}-${index}`} {...editor.getCategoryProps(index)} />
          ))}
        </div>
      </fieldset>

      <RubricToolbar
        {...editor.historyProps}
        onBack={cancelEdit}
        onSave={handleSave}
        canSave={canSave}
        saving={saving}
        canWrite={canWrite}
        validationError={validationError}
        status={!canWrite ? "View only." : dirty ? "Unsaved changes." : "No changes yet."}
        saveLabel={saveLabel}
      />
    </div >
  );
}
