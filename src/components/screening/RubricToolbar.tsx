import { useId } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { RubricHistoryControls } from "./RubricHistoryControls";

interface RubricToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  onBack: () => void;
  onSave: () => void;
  canSave: boolean;
  saving: boolean;
  canWrite?: boolean;
  validationError: string | null;
  status: string;
  saveLabel?: string;
}

export function RubricToolbar({
  canUndo, canRedo, undo, redo, onBack, onSave, canSave, saving,
  canWrite = true, validationError, status, saveLabel = "Save rubric",
}: RubricToolbarProps) {
  const statusId = useId();

  return (
    <div aria-label="Rubric actions" role="region" className="sticky bottom-4 z-30 mt-6">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 sm:gap-x-3 rounded-2xl border border-[#E5E2DA] bg-white px-3 py-3 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] sm:px-5">
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="col-start-1 row-start-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#D9D6CE] bg-white px-3 text-sm font-medium text-[#3A3A3A] transition-colors hover:border-[#C9C5BA] hover:bg-[#F5F3EE] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </button>

        <p
          id={statusId}
          role="status"
          className={`col-span-3 row-start-2 text-xs sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:border-l sm:border-[#E5E2DA] sm:pl-3 ${validationError ? "text-red-700" : "text-[#737373]"}`}
        >
          {validationError ?? status}
        </p>

        <div className="col-start-3 row-start-1 flex items-center justify-end gap-1.5">
          <RubricHistoryControls canUndo={canUndo} canRedo={canRedo} undo={undo} redo={redo} disabled={saving || !canWrite} />
          {canWrite && (
            <>
              <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-[#E5E2DA]" />
              <button
                type="button"
                onClick={onSave}
                disabled={!canSave || saving}
                aria-label={saving ? "Saving rubric" : saveLabel}
                title={saveLabel}
                aria-describedby={statusId}
                aria-busy={saving}
                className="inline-flex min-h-9 max-w-36 items-center justify-center gap-1.5 rounded-xl border border-[#0F0F0F] bg-[#0F0F0F] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-none sm:px-3.5"
              >
                {saving
                  ? <Loader2 size={16} aria-hidden="true" className="shrink-0 animate-spin" />
                  : <Save size={16} aria-hidden="true" className="hidden shrink-0 sm:block" />}
                <span className="sm:hidden">{saving ? "Saving..." : "Save"}</span>
                <span className="hidden sm:inline">{saving ? "Saving..." : saveLabel}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
