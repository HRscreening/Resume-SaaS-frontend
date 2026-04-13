import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { analyzeJD, createJob } from "@/lib/api";
import type { Rubric, RubricCategory, Subcategory } from "@/types";

type Step = 1 | 2;

const CATEGORY_COLORS = [
  { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   dot: "#3B82F6",  label: "Technical Skills & Expertise" },
  { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  dot: "#F59E0B",  label: "Experience & Impact" },
  { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", dot: "#8B5CF6",  label: "Qualifications & Role Fit" },
];

export default function NewScreening() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);

  const [title, setTitle] = useState("");
  const [jdText, setJdText] = useState("");
  const [analyzingJD, setAnalyzingJD] = useState(false);

  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyzeJD() {
    if (!jdText.trim() || analyzingJD) return;
    setError(null);
    setAnalyzingJD(true);
    try {
      const result = await analyzeJD(jdText);
      setRubric(result);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze JD");
    } finally {
      setAnalyzingJD(false);
    }
  }

  function updateCategoryWeight(catIdx: number, weight: number) {
    if (!rubric) return;
    const updated = rubric.categories.map((c, i) =>
      i === catIdx ? { ...c, weight } : c
    );
    setRubric({ ...rubric, categories: updated });
  }

  function updateSubcategory(catIdx: number, subIdx: number, updates: Partial<Subcategory>) {
    if (!rubric) return;
    const updated = rubric.categories.map((cat, ci) => {
      if (ci !== catIdx) return cat;
      const subs = cat.subcategories.map((s, si) =>
        si === subIdx ? { ...s, ...updates } : s
      );
      return { ...cat, subcategories: subs };
    });
    setRubric({ ...rubric, categories: updated });
  }

  function removeSubcategory(catIdx: number, subIdx: number) {
    if (!rubric) return;
    const updated = rubric.categories.map((cat, ci) => {
      if (ci !== catIdx) return cat;
      return { ...cat, subcategories: cat.subcategories.filter((_, si) => si !== subIdx) };
    });
    setRubric({ ...rubric, categories: updated });
  }

  function addSubcategory(catIdx: number) {
    if (!rubric) return;
    const cat = rubric.categories[catIdx];
    if (cat.subcategories.length >= 5) return;
    const updated = rubric.categories.map((c, ci) => {
      if (ci !== catIdx) return c;
      return { ...c, subcategories: [...c.subcategories, { name: "", weight: 20, description: "" }] };
    });
    setRubric({ ...rubric, categories: updated });
  }

  async function handleSaveJob() {
    if (!rubric || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { screening_id } = await createJob({
        title: title.trim(),
        raw_jd_text: jdText,
        rubric,
      });
      queryClient.invalidateQueries({ queryKey: ["screenings"] });
      navigate({ to: "/screenings/$id", params: { id: screening_id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save job");
    } finally {
      setSaving(false);
    }
  }

  const totalWeight = rubric?.categories.reduce((s, c) => s + c.weight, 0) ?? 0;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F0F0F] mb-4">New Job</h1>
        <div className="flex items-center gap-0">
          {(["Job description", "Review rubric"] as const).map((label, i) => {
            const s = (i + 1) as Step;
            const done = step > s;
            const active = step === s;
            return (
              <div key={label} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    done ? "bg-green-600 text-white" : active ? "bg-[#0F0F0F] text-white" : "bg-[#E8E5DF] text-[#737373]"
                  }`}>{done ? "\u2713" : s}</div>
                  <span className={`text-sm font-medium ${active ? "text-[#0F0F0F]" : "text-[#737373]"}`}>{label}</span>
                </div>
                {i < 1 && <div className="w-12 h-px bg-[#D4D4D4] mx-3" />}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Step 1: JD */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-8">
          <h2 className="text-lg font-semibold text-[#0F0F0F] mb-1">Job description</h2>
          <p className="text-sm text-[#737373] mb-6">Paste your JD and we'll auto-generate a 3-category scoring rubric.</p>
          <div className="space-y-5">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">Job title <span className="text-red-500">*</span></label>
              <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Backend Engineer — April 2026"
                className="w-full h-11 px-3.5 rounded-xl border border-[#D4D4D4] bg-[#F5F3EE] text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow" />
            </div>
            <div>
              <label htmlFor="jd" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">Job description <span className="text-red-500">*</span></label>
              <textarea id="jd" rows={10} value={jdText} onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste your full job description here..."
                className="w-full px-3.5 py-3 rounded-xl border border-[#D4D4D4] bg-[#F5F3EE] text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow resize-none" />
              <p className="mt-1 text-xs text-[#A0A0A0]">{jdText.length} characters</p>
            </div>
            <button onClick={handleAnalyzeJD} disabled={!title.trim() || !jdText.trim() || analyzingJD}
              className="w-full h-11 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
              {analyzingJD && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {analyzingJD ? "Analyzing job description..." : "Generate scoring rubric \u2192"}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: 3-Category Rubric Editor */}
      {step === 2 && rubric && (
        <div className="space-y-4">
          {/* Meta header */}
          <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-[#0F0F0F]">Review rubric</h2>
              <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                totalWeight === 100 ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
              }`}>
                {totalWeight === 100 ? "Weights sum to 100%" : `Weights sum to ${totalWeight}% (must be 100)`}
              </span>
            </div>
            <p className="text-sm text-[#737373]">AI-generated from your JD. Adjust weights and subcategories as needed.</p>
            {rubric.domain && (
              <div className="flex items-center gap-3 mt-3 p-2.5 bg-[#F5F3EE] rounded-lg">
                <span className="text-xs text-[#737373]">Domain: <strong className="text-[#0F0F0F]">{rubric.domain}</strong></span>
                {rubric.seniority_level && (
                  <>
                    <span className="text-[#D4D4D4]">|</span>
                    <span className="text-xs text-[#737373]">Level: <strong className="text-[#0F0F0F]">{rubric.seniority_level}</strong></span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 3 Category cards */}
          {rubric.categories.map((cat, catIdx) => {
            const color = CATEGORY_COLORS[catIdx] ?? CATEGORY_COLORS[0];
            const subWeightSum = cat.subcategories.reduce((s, sub) => s + sub.weight, 0);
            return (
              <div key={cat.name} className={`rounded-2xl border-2 overflow-hidden ${color.border}`}>
                {/* Category header */}
                <div className={`px-5 py-4 ${color.bg} flex items-center justify-between`}>
                  <div className="flex items-center gap-2.5">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color.dot }} />
                    <h3 className={`text-sm font-bold ${color.text}`}>{cat.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#737373]">Weight:</span>
                    <input
                      type="number"
                      min={0} max={100}
                      value={cat.weight}
                      onChange={(e) => updateCategoryWeight(catIdx, Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-16 h-7 px-2 text-center rounded-lg border border-[#D4D4D4] text-xs font-bold text-[#0F0F0F] bg-white focus:outline-none focus:ring-1 focus:ring-[#C85A17]"
                    />
                    <span className="text-xs text-[#737373]">%</span>
                  </div>
                </div>

                {/* Subcategories */}
                <div className="bg-white p-4 space-y-3">
                  {cat.subcategories.length === 0 && (
                    <p className="text-xs text-[#A0A0A0] text-center py-3">No subcategories. Click below to add one.</p>
                  )}

                  {cat.subcategories.map((sub, subIdx) => (
                    <div key={subIdx} className="border border-[#E8E5DF] rounded-xl p-3.5">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0 space-y-2">
                          <input
                            type="text"
                            value={sub.name}
                            onChange={(e) => updateSubcategory(catIdx, subIdx, { name: e.target.value })}
                            placeholder="Subcategory name"
                            className="w-full text-sm font-medium text-[#0F0F0F] bg-transparent border-0 border-b border-transparent hover:border-[#D4D4D4] focus:border-[#C85A17] focus:outline-none pb-0.5 transition-colors"
                          />
                          <input
                            type="text"
                            value={sub.description}
                            onChange={(e) => updateSubcategory(catIdx, subIdx, { description: e.target.value })}
                            placeholder="Brief description of what to evaluate..."
                            className="w-full text-xs text-[#737373] bg-transparent border-0 border-b border-transparent hover:border-[#D4D4D4] focus:border-[#C85A17] focus:outline-none pb-0.5 transition-colors"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min={0} max={100}
                            value={sub.weight}
                            onChange={(e) => updateSubcategory(catIdx, subIdx, { weight: Math.min(100, Math.max(0, Number(e.target.value))) })}
                            className="w-14 h-7 px-2 text-center rounded-lg border border-[#D4D4D4] text-xs font-semibold bg-white focus:outline-none focus:ring-1 focus:ring-[#C85A17]"
                          />
                          <span className="text-xs text-[#A0A0A0]">%</span>
                          <button onClick={() => removeSubcategory(catIdx, subIdx)}
                            className="h-7 w-7 rounded-lg text-[#A0A0A0] hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add + weight sum */}
                  <div className="flex items-center justify-between pt-1">
                    {cat.subcategories.length < 5 ? (
                      <button onClick={() => addSubcategory(catIdx)}
                        className="text-xs text-[#737373] hover:text-[#0F0F0F] flex items-center gap-1 transition-colors">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 1v10M1 6h10" /></svg>
                        Add subcategory
                      </button>
                    ) : <span />}
                    <span className={`text-xs font-medium ${subWeightSum === 100 ? "text-green-600" : "text-red-500"}`}>
                      {subWeightSum === 100 ? "100%" : `${subWeightSum}% (must be 100)`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(1)}
              className="h-10 px-4 border border-[#D4D4D4] text-sm font-medium text-[#404040] rounded-xl hover:bg-[#F5F3EE] transition-colors">
              &larr; Back
            </button>
            <button onClick={handleSaveJob}
              disabled={totalWeight !== 100 || saving}
              className="flex-1 h-10 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {saving && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {saving ? "Saving job..." : "Save job"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
