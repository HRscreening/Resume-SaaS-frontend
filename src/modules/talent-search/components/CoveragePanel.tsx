import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { sourceLabel } from "../logic";
import type { Coverage } from "../types";

const FIELD_LABELS: Record<string, string> = {
  photo: "Photo", linkedin: "LinkedIn", full_name: "Full name", title: "Title", company: "Company",
  location: "Location", work_history: "Work history", skills: "Skills", email: "Email",
};

// Test mode only: how complete each source's data is, to decide which vendor to pay for.
export function CoveragePanel({ coverage }: { coverage: Coverage | undefined }) {
  const [open, setOpen] = useState(true);
  if (!coverage?.providers) return null;
  const providers = Object.entries(coverage.providers);
  return (
    <div className="rounded-2xl border border-dashed border-[#C9C6C0] bg-[#FAFAF8]">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold">
        <span>Data check (test mode)</span>
        <ChevronDown size={16} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>
      {open && (
        <div className="overflow-x-auto px-4 pb-4">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="text-left text-[#737373]">
                <th className="py-1 pr-3 font-medium">Source</th>
                <th className="py-1 pr-3 font-medium">Returned</th>
                {Object.values(FIELD_LABELS).map((l) => <th key={l} className="py-1 pr-3 font-medium">{l}</th>)}
              </tr>
            </thead>
            <tbody>
              {providers.map(([name, data]) => (
                <tr key={name} className="tabular-nums">
                  <td className="py-1 pr-3 font-medium">{sourceLabel(name)}</td>
                  <td className="py-1 pr-3">{data.returned}</td>
                  {Object.keys(FIELD_LABELS).map((f) => <td key={f} className="py-1 pr-3">{data.fields[f] ?? 0}%</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-[#737373]">People found by more than one source: {coverage.cross_provider_duplicates}</p>
        </div>
      )}
    </div>
  );
}
