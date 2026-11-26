import { Check, X, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { sourceLabel } from "../logic";
import type { SearchResult, SkillVerdict } from "../types";
import { LinkedInIcon } from "./LinkedInIcon";
import { ProspectAvatar } from "./ProspectAvatar";

interface ResultsTableProps {
  results: SearchResult[];
  mustHaves: string[];
  onOpen: (result: SearchResult) => void;
  onVerdict: (result: SearchResult, verdict: SearchResult["verdict"]) => void;
}

const BAND_STYLE: Record<string, string> = {
  strong: "bg-green-50 text-green-700",
  good: "bg-emerald-50 text-emerald-700",
  partial: "bg-amber-50 text-amber-700",
  weak: "bg-neutral-100 text-neutral-600",
};

function SkillMark({ verdict }: { verdict?: SkillVerdict }) {
  if (verdict?.verdict === "yes") return <Check size={16} className="text-green-600" aria-label="Has skill" />;
  if (verdict?.verdict === "no") return <X size={16} className="text-red-500" aria-label="Lacks skill" />;
  return <Minus size={16} className="text-[#C9C6C0]" aria-label="Unknown" />;
}

export function ResultsTable({ results, mustHaves, onOpen, onVerdict }: ResultsTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E5E3DF] bg-white">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-[#EEECE8] text-left text-xs uppercase tracking-wide text-[#737373]">
            <th className="px-4 py-3 font-semibold">Candidate</th>
            <th className="px-3 py-3 font-semibold">Company</th>
            <th className="px-3 py-3 font-semibold">Location</th>
            <th className="px-3 py-3 font-semibold">Match</th>
            {mustHaves.map((skill) => (
              <th key={skill} className="px-2 py-3 font-semibold text-center normal-case">{skill}</th>
            ))}
            <th className="px-3 py-3 font-semibold">Source</th>
            <th className="px-3 py-3" />
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.id} onClick={() => onOpen(r)} className={cn("border-b border-[#F3F1ED] last:border-0 cursor-pointer hover:bg-[#FAFAF8]", r.verdict === "rejected" && "opacity-50")}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <ProspectAvatar name={r.full_name} photoUrl={r.photo_url} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-[#0F0F0F] truncate">{r.full_name ?? "Name hidden"}</span>
                      {r.linkedin_url && (
                        <a href={r.linkedin_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#0A66C2]" aria-label="LinkedIn profile">
                          <LinkedInIcon className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-[#737373] truncate max-w-[16rem]">{r.current_title ?? ""}</p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 text-[#3D3D3D]">{r.current_company ?? ""}</td>
              <td className="px-3 py-3 text-[#3D3D3D]">{r.location ?? ""}</td>
              <td className="px-3 py-3">
                <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", BAND_STYLE[r.fit_band])}>{r.score}%</span>
              </td>
              {mustHaves.map((skill) => (
                <td key={skill} data-skill-cell className="px-2 py-3">
                  <div className="flex justify-center"><SkillMark verdict={r.skill_verdicts[skill]} /></div>
                </td>
              ))}
              <td className="px-3 py-3 text-xs text-[#737373]">{r.sources.map(sourceLabel).join(" + ")}</td>
              <td className="px-3 py-3">
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => onVerdict(r, r.verdict === "shortlisted" ? "pending" : "shortlisted")} className={cn("rounded-md border px-2 py-1 text-xs", r.verdict === "shortlisted" ? "border-green-600 bg-green-50 text-green-700" : "border-[#E5E3DF]")}>
                    Shortlist
                  </button>
                  <button type="button" onClick={() => onVerdict(r, r.verdict === "rejected" ? "pending" : "rejected")} className={cn("rounded-md border px-2 py-1 text-xs", r.verdict === "rejected" ? "border-red-500 bg-red-50 text-red-600" : "border-[#E5E3DF]")}>
                    Reject
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
