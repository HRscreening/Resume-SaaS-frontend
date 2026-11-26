import { useState } from "react";
import { X, Star } from "lucide-react";
import type { SearchSpec } from "../types";

interface SpecChipsProps {
  spec: SearchSpec;
  saving: boolean;
  searching: boolean;
  onSave: (spec: SearchSpec) => void;
  onSearch: (spec: SearchSpec) => void;
}

type ListField = "must_have_skills" | "nice_to_have_skills" | "title_variants";

function locationLabel(l: SearchSpec["locations"][number]) {
  return [l.city, l.region, l.country].filter(Boolean).join(", ");
}

export function SpecChips({ spec, saving, searching, onSave, onSearch }: SpecChipsProps) {
  const [draft, setDraft] = useState<SearchSpec>(spec);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const yearsInvalid = draft.min_years != null && draft.max_years != null && draft.min_years > draft.max_years;
  const canSearch = !yearsInvalid && (draft.must_have_skills.length > 0 || draft.title_variants.length > 0);

  const removeFrom = (field: ListField, value: string) =>
    setDraft((d) => ({ ...d, [field]: d[field].filter((v) => v !== value) }));
  const addTo = (field: ListField) => {
    const value = (inputs[field] ?? "").trim();
    if (!value || draft[field].includes(value)) return;
    setDraft((d) => ({ ...d, [field]: [...d[field], value] }));
    setInputs((i) => ({ ...i, [field]: "" }));
  };
  const setYears = (key: "min_years" | "max_years", raw: string) =>
    setDraft((d) => ({ ...d, [key]: raw === "" ? null : Math.max(0, Math.min(40, Number(raw))) }));

  const listRow = (field: ListField, label: string, starred = false) => (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#737373]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {draft[field].map((value) => (
          <span key={value} className="inline-flex items-center gap-1 rounded-full border border-[#E5E3DF] bg-white px-3 py-1 text-sm">
            {starred && <Star size={12} className="fill-[#C85A17] text-[#C85A17]" />}
            {value}
            <button type="button" aria-label={`Remove ${value}`} onClick={() => removeFrom(field, value)} className="text-[#A3A3A3] hover:text-[#0F0F0F]">
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          id={`add-${field}`}
          value={inputs[field] ?? ""}
          onChange={(e) => setInputs((i) => ({ ...i, [field]: e.target.value }))}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTo(field); } }}
          placeholder="Add and press Enter"
          className="min-w-[10rem] rounded-full border border-dashed border-[#D4D4D4] px-3 py-1 text-sm focus:outline-none"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-5 rounded-2xl border border-[#E5E3DF] bg-[#FAFAF8] p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#737373]">Role</p>
        <input
          id="spec-role"
          value={draft.role_title}
          onChange={(e) => setDraft((d) => ({ ...d, role_title: e.target.value }))}
          className="mt-1 w-full bg-transparent text-lg font-semibold text-[#0F0F0F] focus:outline-none"
        />
      </div>
      {listRow("must_have_skills", "Must-have skills", true)}
      {listRow("nice_to_have_skills", "Nice to have")}
      {listRow("title_variants", "Job titles to search")}
      <div className="flex flex-wrap gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#737373]">Experience (years)</p>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <input id="spec-min-years" type="number" min={0} max={40} value={draft.min_years ?? ""} onChange={(e) => setYears("min_years", e.target.value)} className="w-16 rounded-md border border-[#E5E3DF] px-2 py-1" />
            <span>to</span>
            <input id="spec-max-years" type="number" min={0} max={40} value={draft.max_years ?? ""} onChange={(e) => setYears("max_years", e.target.value)} className="w-16 rounded-md border border-[#E5E3DF] px-2 py-1" placeholder="any" />
          </div>
          {yearsInvalid && <p className="mt-1 text-xs text-red-600">Minimum years cannot be more than maximum.</p>}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#737373]">Location</p>
          <p className="mt-1 text-sm text-[#0F0F0F]">{draft.locations.map(locationLabel).join(" · ") || "Anywhere"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#737373]">Work mode</p>
          <select id="spec-work-mode" value={draft.work_mode} onChange={(e) => setDraft((d) => ({ ...d, work_mode: e.target.value as SearchSpec["work_mode"] }))} className="mt-1 rounded-md border border-[#E5E3DF] bg-white px-2 py-1 text-sm">
            <option value="any">Any</option>
            <option value="onsite">Onsite</option>
            <option value="hybrid">Hybrid</option>
            <option value="remote">Remote</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 pt-1">
        <button type="button" disabled={!canSearch || searching} onClick={() => onSearch(draft)} className="rounded-lg bg-[#C85A17] text-white text-sm font-medium px-4 py-2 disabled:opacity-40">
          {searching ? "Starting…" : "Find candidates"}
        </button>
        <button type="button" disabled={yearsInvalid || saving} onClick={() => onSave(draft)} className="rounded-lg border border-[#D4D4D4] text-sm px-4 py-2 disabled:opacity-40">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
