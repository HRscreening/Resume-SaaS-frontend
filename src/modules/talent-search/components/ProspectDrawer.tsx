import { useState } from "react";
import { Check, Minus, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FIT_LABEL, SWITCH_LABEL, formatMonths, sourceLabel } from "../logic";
import type { SearchResult } from "../types";
import { LinkedInIcon } from "./LinkedInIcon";
import { ProspectAvatar } from "./ProspectAvatar";

interface ProspectDrawerProps {
  result: SearchResult | null;
  mustHaves: string[];
  showRaw: boolean;
  onClose: () => void;
}

function dateRange(start?: string | null, end?: string | null, current?: boolean) {
  const fmt = (d?: string | null) => (d ? d.slice(0, 7) : "");
  return `${fmt(start) || "?"} to ${current || !end ? "now" : fmt(end)}`;
}

export function ProspectDrawer({ result, mustHaves, showRaw, onClose }: ProspectDrawerProps) {
  const [rawOpen, setRawOpen] = useState(false);
  return (
    <Sheet open={!!result} onOpenChange={(open) => { if (!open) { setRawOpen(false); onClose(); } }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {result && (
          <>
            <SheetHeader>
              <div className="flex items-start gap-4">
                <ProspectAvatar name={result.full_name} photoUrl={result.photo_url} size="lg" />
                <div className="min-w-0 space-y-1">
                  <SheetTitle className="flex items-center gap-2">
                    {result.full_name ?? "Name hidden"}
                    {result.linkedin_url && (
                      <a href={result.linkedin_url} target="_blank" rel="noreferrer" className="text-[#0A66C2]" aria-label="LinkedIn profile">
                        <LinkedInIcon />
                      </a>
                    )}
                  </SheetTitle>
                  <p className="text-sm text-[#3D3D3D]">{result.headline ?? result.current_title}</p>
                  <p className="text-xs text-[#737373]">{result.location}</p>
                  <p className="text-sm font-semibold text-[#0F0F0F]">{FIT_LABEL[result.fit_band]} · {result.score}</p>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-8">
              {result.summary && <p className="text-sm text-[#3D3D3D]">{result.summary}</p>}

              <section className="grid grid-cols-3 gap-3 rounded-xl bg-[#FAFAF8] p-4 text-center">
                {[
                  ["Overall", result.tenure.total_months],
                  ["Average per company", result.tenure.avg_months],
                  ["Current role", result.tenure.current_months],
                ].map(([label, months]) => (
                  <div key={label as string}>
                    <p className="text-lg font-semibold tabular-nums">{formatMonths(months as number)}</p>
                    <p className="text-xs text-[#737373]">{label}</p>
                  </div>
                ))}
                <p className="col-span-3 text-xs text-[#737373]">Estimate: {SWITCH_LABEL[result.switch_likelihood]}</p>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Must-have skills</h3>
                {mustHaves.map((skill) => {
                  const v = result.skill_verdicts[skill];
                  return (
                    <div key={skill} className="flex gap-3">
                      <span className="mt-0.5">
                        {v?.verdict === "yes" ? <Check size={16} className="text-green-600" /> : v?.verdict === "no" ? <X size={16} className="text-red-500" /> : <Minus size={16} className="text-[#C9C6C0]" />}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{skill}</p>
                        <p className="text-xs text-[#737373]">{v?.evidence || "No evidence in the profile"}</p>
                      </div>
                    </div>
                  );
                })}
              </section>

              {result.work_history.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Work history</h3>
                  <ol className="space-y-3 border-l border-[#E5E3DF] pl-4">
                    {result.work_history.map((role, i) => (
                      <li key={i}>
                        <p className="text-sm font-medium">{role.title}</p>
                        <p className="text-xs text-[#5C5C5C]">{role.company}</p>
                        <p className="text-xs text-[#A3A3A3]">{dateRange(role.start_date, role.end_date, role.current)}</p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {result.skills.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Listed skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.skills.slice(0, 30).map((s) => (
                      <span key={s} className="rounded-full bg-[#F3F1ED] px-2 py-0.5 text-xs">{s}</span>
                    ))}
                  </div>
                </section>
              )}

              <p className="text-xs text-[#A3A3A3]">Source: {result.sources.map(sourceLabel).join(" + ")}</p>

              {showRaw && result.raw_records && (
                <section className="space-y-2">
                  <button type="button" onClick={() => setRawOpen((o) => !o)} className="text-xs underline text-[#5C5C5C]">
                    {rawOpen ? "Hide raw data" : "View raw data"}
                  </button>
                  {rawOpen && (
                    <div className="grid gap-3">
                      {Object.entries(result.raw_records).map(([provider, raw]) => (
                        <div key={provider}>
                          <p className="text-xs font-semibold">{sourceLabel(provider)}</p>
                          <pre className="max-h-80 overflow-auto rounded-lg bg-[#0F0F0F] p-3 text-[11px] text-[#E5E5E5]">{JSON.stringify(raw, null, 2)}</pre>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
