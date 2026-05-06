import { useEffect, useRef, useState } from "react";
import type { BatchProgress, FileProgress } from "@/types";
import { PendingResumeRow } from "./PendingResumeRow";

interface Props {
  progress: BatchProgress;
  onClose: () => void;
}

const CHUNK = 50;

export function PendingFilesDialog({ progress, onClose }: Props) {
  const pending = progress.per_file_results.filter(
    (f) => f.stage !== "scored" && f.stage !== "error",
  );

  const [visible, setVisible] = useState(CHUNK);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Lazy-render rows in chunks as the user scrolls — keeps DOM small for huge batches.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisible((v) => Math.min(v + CHUNK, pending.length));
      }
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [pending.length]);

  const counts = countByStage(pending);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-2xl border border-[#E8E5DF] max-w-2xl w-full max-h-[80vh] flex flex-col m-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E8E5DF] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[#0F0F0F]">In progress</h2>
            <p className="text-xs text-[#737373] mt-0.5">{stageLine(counts) || `${pending.length} resume${pending.length !== 1 ? "s" : ""}`}</p>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-lg hover:bg-[#F5F3EE] flex items-center justify-center text-[#737373]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#E8E5DF]">
          {pending.slice(0, visible).map((f) => (
            <PendingResumeRow key={f.resume_id} file={f} />
          ))}
          {visible < pending.length && (
            <div ref={sentinelRef} className="py-4 flex items-center justify-center">
              <div className="h-4 w-4 rounded-full border-2 border-[#A0A0A0] border-t-transparent animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function countByStage(files: FileProgress[]) {
  const c = { queued: 0, parsing: 0, parsed: 0, scoring: 0, scored: 0, error: 0 } as Record<string, number>;
  for (const f of files) c[f.stage] = (c[f.stage] ?? 0) + 1;
  return c;
}

export function stageLine(counts: Record<string, number>): string {
  const parts: string[] = [];
  if (counts.parsing) parts.push(`${counts.parsing} parsing`);
  if (counts.parsed)  parts.push(`${counts.parsed} parsed`);
  if (counts.scoring) parts.push(`${counts.scoring} scoring`);
  if (counts.queued)  parts.push(`${counts.queued} queued`);
  return parts.join(" · ");
}
