import { useEffect, useRef, useState } from "react";
import type { BatchProgress } from "@/types";
import { PendingResumeRow } from "./PendingResumeRow";
import { PendingFilesDialog, countByStage, stageLine } from "./PendingFilesDialog";

interface Props {
  progress: BatchProgress | null;
  totalFiles: number;
  /** Bumped by the parent whenever a new upload happens — triggers a brief auto-expand. */
  uploadNonce?: number;
}

const INLINE_THRESHOLD = 20;
const AUTO_COLLAPSE_MS = 4000;

export function ProcessingAccordion({ progress, totalFiles, uploadNonce }: Props) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const pending = progress?.per_file_results.filter(
    (f) => f.stage !== "scored" && f.stage !== "error",
  ) ?? [];
  const counts = countByStage(pending);

  const pct = progress?.percentage ?? 0;
  const scored = progress?.scored_count ?? 0;
  const failed = progress?.failed_count ?? 0;
  const total = progress?.total_files ?? totalFiles;
  const useDialog = pending.length > INLINE_THRESHOLD;

  // Auto-expand briefly after a new upload so the user sees their files queued.
  const lastNonce = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (uploadNonce === undefined || uploadNonce === lastNonce.current) return;
    lastNonce.current = uploadNonce;
    if (useDialog) return; // dialog is heavier — don't auto-pop it
    setOpen(true);
    const t = setTimeout(() => setOpen(false), AUTO_COLLAPSE_MS);
    return () => clearTimeout(t);
  }, [uploadNonce, useDialog]);

  function handleToggle() {
    if (useDialog) {
      setDialogOpen(true);
    } else {
      setOpen((v) => !v);
    }
  }

  const sLine = stageLine(counts);

  return (
    <>
      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <button
          type="button"
          onClick={handleToggle}
          disabled={pending.length === 0}
          className={`w-full text-left p-4 flex items-center gap-4 transition-colors ${pending.length > 0 ? "hover:bg-[#FAFAF8] cursor-pointer" : "cursor-default"}`}
        >
          <div className="h-8 w-8 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-semibold text-[#0F0F0F]">
                {scored + failed} of {total} processed
                {failed > 0 && <span className="text-red-600 font-normal"> · {failed} failed</span>}
              </p>
              <span className="text-sm font-bold text-[#0F0F0F] shrink-0 ml-4">{pct}%</span>
            </div>
            <div className="h-1.5 w-full bg-[#E8E5DF] rounded-full overflow-hidden">
              <div className="h-full bg-[#0F0F0F] rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1.5 gap-3">
              <p className="text-xs text-[#A0A0A0] truncate">
                {sLine || "Scored candidates appear below · Ranking finalizes when all complete"}
              </p>
              {pending.length > 0 && (
                <span className="text-xs font-medium text-[#737373] shrink-0 flex items-center gap-1">
                  {useDialog ? `View all ${pending.length}` : open ? "Hide" : `View ${pending.length}`}
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                    className={`transition-transform ${!useDialog && open ? "rotate-180" : ""}`}>
                    <path d="M2 4l3.5 3.5L9 4" />
                  </svg>
                </span>
              )}
            </div>
          </div>
        </button>

        {!useDialog && open && pending.length > 0 && (
          <div className="border-t border-[#E8E5DF] divide-y divide-[#E8E5DF] max-h-80 overflow-y-auto">
            {pending.map((f) => <PendingResumeRow key={f.resume_id} file={f} />)}
          </div>
        )}
      </div>

      {dialogOpen && progress && (
        <PendingFilesDialog progress={progress} onClose={() => setDialogOpen(false)} />
      )}
    </>
  );
}
