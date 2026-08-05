import { useState } from "react";
import type { TranscriptTurn } from "@/types";

/**
 * The raw call, collapsed. Agent turns are copper and candidate turns are ink so
 * a recruiter can skim for who said what without reading labels.
 */
export function TranscriptPanel({ turns }: { turns: TranscriptTurn[] | null }) {
  const [open, setOpen] = useState(false);
  const count = turns?.length ?? 0;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-[#0F0F0F] underline underline-offset-2 hover:text-[#C85A17]"
      >
        {open ? "Hide transcript" : `Full transcript${count ? ` (${count} turns)` : ""}`}
      </button>
      {open && (
        <div className="mt-2 max-h-80 space-y-2 overflow-y-auto rounded-lg border border-[#E8E5DF] bg-white p-3">
          {count === 0 && (
            <p className="text-xs text-[#737373]">No transcript available for this call.</p>
          )}
          {turns?.map((turn, i) => {
            const isAgent = turn.speaker === "agent";
            return (
              <p key={i} className="text-xs leading-relaxed">
                <span
                  className={`font-semibold ${isAgent ? "text-[#C85A17]" : "text-[#0F0F0F]"}`}
                >
                  {isAgent ? "AI" : "Candidate"}
                </span>
                <span className="text-[#A3A3A3]"> · </span>
                <span className="text-[#404040]">{turn.text}</span>
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
