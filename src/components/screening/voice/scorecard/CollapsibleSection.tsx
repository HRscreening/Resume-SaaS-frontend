import { useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  /** Optional item count shown next to the title while collapsed. */
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/**
 * Progressive disclosure for scorecard evidence sections. The drawer shows
 * verdict, flags and screening facts at a glance; everything that justifies
 * them lives behind these toggles so the panel reads as a decision surface,
 * not a report dump.
 */
export function CollapsibleSection({ title, count, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-[#E8E5DF] bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#737373]">
          {title}
          {!open && count != null && count > 0 && (
            <span className="ml-1.5 font-normal normal-case tracking-normal text-[#A3A3A3]">({count})</span>
          )}
        </span>
        <span className="text-[11px] text-[#A3A3A3]">{open ? "Hide" : "Show"}</span>
      </button>
      {open && <div className="px-3.5 pb-3.5">{children}</div>}
    </section>
  );
}
