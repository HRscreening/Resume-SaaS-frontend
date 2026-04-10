import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { analyzeJD, createJob } from "@/lib/api";
import type { Rubric, RubricCriterion } from "@/types";

type Step = 1 | 2;

export default function NewScreening() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [title, setTitle] = useState("");
  const [jdText, setJdText] = useState("");
  const [analyzingJD, setAnalyzingJD] = useState(false);

  // Step 2
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

  function updateCriterion(index: number, updates: Partial<RubricCriterion>) {
    if (!rubric) return;
    const updated = rubric.criteria.map((c, i) =>
      i === index ? { ...c, ...updates } : c
    );
    setRubric({ ...rubric, criteria: updated });
  }

  function removeCriterion(index: number) {
    if (!rubric) return;
    setRubric({ ...rubric, criteria: rubric.criteria.filter((_, i) => i !== index) });
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

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F0F0F] mb-4">New Job</h1>

        {/* Steps */}
        <div className="flex items-center gap-0">
          {(["Job description", "Review rubric"] as const).map((label, i) => {
            const s = (i + 1) as Step;
            const done = step > s;
            const active = step === s;
            return (
              <div key={label} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    done ? "bg-green-600 text-white" :
                    active ? "bg-[#0F0F0F] text-white" :
                    "bg-[#E8E5DF] text-[#737373]"
                  }`}>
                    {done ? "\u2713" : s}
                  </div>
                  <span className={`text-sm font-medium ${active ? "text-[#0F0F0F]" : "text-[#737373]"}`}>
                    {label}
                  </span>
                </div>
                {i < 1 && <div className="w-12 h-px bg-[#D4D4D4] mx-3"/>}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: JD */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-8">
          <h2 className="text-lg font-semibold text-[#0F0F0F] mb-1">Job description</h2>
          <p className="text-sm text-[#737373] mb-6">
            Paste your JD and we'll auto-generate a scoring rubric.
          </p>

          <div className="space-y-5">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">
                Job title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Backend Engineer — April 2026"
                className="w-full h-11 px-3.5 rounded-xl border border-[#D4D4D4] bg-[#F5F3EE] text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow"
              />
            </div>

            <div>
              <label htmlFor="jd" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">
                Job description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="jd"
                rows={10}
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste your full job description here…"
                className="w-full px-3.5 py-3 rounded-xl border border-[#D4D4D4] bg-[#F5F3EE] text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow resize-none"
              />
              <p className="mt-1 text-xs text-[#A0A0A0]">{jdText.length} characters</p>
            </div>

            <button
              onClick={handleAnalyzeJD}
              disabled={!title.trim() || !jdText.trim() || analyzingJD}
              className="w-full h-11 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {analyzingJD && (
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>
              )}
              {analyzingJD ? "Analyzing job description…" : "Generate scoring rubric \u2192"}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Rubric */}
      {step === 2 && rubric && (
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-8">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-[#0F0F0F]">Review rubric</h2>
            <span className="text-xs text-[#737373] bg-[#F5F3EE] px-2 py-1 rounded-md">
              {rubric.criteria.length} criteria
            </span>
          </div>
          <p className="text-sm text-[#737373] mb-6">
            AI-generated from your JD. Edit weights or remove criteria as needed.
          </p>

          {rubric.domain && (
            <div className="flex items-center gap-3 mb-6 p-3 bg-[#F5F3EE] rounded-xl">
              <div>
                <span className="text-xs text-[#737373]">Domain: </span>
                <span className="text-xs font-medium text-[#0F0F0F]">{rubric.domain}</span>
              </div>
              {rubric.seniority_level && (
                <>
                  <div className="h-3 w-px bg-[#D4D4D4]"/>
                  <div>
                    <span className="text-xs text-[#737373]">Level: </span>
                    <span className="text-xs font-medium text-[#0F0F0F]">{rubric.seniority_level}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="space-y-3 mb-6">
            {rubric.criteria.map((c, i) => (
              <div key={i} className="border border-[#E8E5DF] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0F0F0F] mb-1">{c.name}</p>
                    <p className="text-xs text-[#737373]">{c.description}</p>
                  </div>
                  <button
                    onClick={() => removeCriterion(i)}
                    className="h-7 w-7 rounded-lg text-[#737373] hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors shrink-0"
                    aria-label="Remove criterion"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M2 2l8 8M10 2l-8 8"/>
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={c.type}
                    onChange={(e) => updateCriterion(i, { type: e.target.value as "must" | "should" | "nice" })}
                    className="h-7 px-2 rounded-lg border border-[#D4D4D4] text-xs text-[#0F0F0F] bg-white focus:outline-none focus:ring-1 focus:ring-[#C85A17]"
                  >
                    <option value="must">Must have (1.5x)</option>
                    <option value="should">Should have (1x)</option>
                    <option value="nice">Nice to have (0.5x)</option>
                  </select>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#737373]">Weight:</span>
                    <select
                      value={c.weight}
                      onChange={(e) => updateCriterion(i, { weight: Number(e.target.value) })}
                      className="h-7 px-2 rounded-lg border border-[#D4D4D4] text-xs text-[#0F0F0F] bg-white focus:outline-none focus:ring-1 focus:ring-[#C85A17]"
                    >
                      {[1, 2, 3, 4, 5].map((w) => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="h-10 px-4 border border-[#D4D4D4] text-sm font-medium text-[#404040] rounded-xl hover:bg-[#F5F3EE] transition-colors"
            >
              \u2190 Back
            </button>
            <button
              onClick={handleSaveJob}
              disabled={rubric.criteria.length === 0 || saving}
              className="flex-1 h-10 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {saving && (
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>
              )}
              {saving ? "Saving job…" : "Save job"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
