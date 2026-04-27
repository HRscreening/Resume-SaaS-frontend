import { useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { analyzeJD, createJob, parseJDFile } from "@/lib/api";
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
  const [jdInputMode, setJdInputMode] = useState<"paste" | "upload">("paste");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [extractingJD, setExtractingJD] = useState(false);
  const [jdFileDragActive, setJdFileDragActive] = useState(false);
  const jdFileInputRef = useRef<HTMLInputElement>(null);

  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJDFileSelect(file: File) {
    setJdFile(file);
    setJdText("");
    setExtractingJD(true);
    setError(null);
    try {
      const { text } = await parseJDFile(file);
      setJdText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not extract text from file");
      setJdFile(null);
    } finally {
      setExtractingJD(false);
    }
  }

  async function handleAnalyzeJD() {
    if (!jdText.trim() || analyzingJD) return;
    setError(null);
    setAnalyzingJD(true);
    try {
      const result = await analyzeJD(jdText);
      const sorted = {
        ...result,
        categories: result.categories.map((cat) => ({
          ...cat,
          // Non-negotiables first, then by weight descending
          subcategories: [...cat.subcategories].sort((a, b) => {
            if (a.is_non_negotiable && !b.is_non_negotiable) return -1;
            if (!a.is_non_negotiable && b.is_non_negotiable) return 1;
            return b.weight - a.weight;
          }),
        })),
      };
      setRubric(sorted);
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
      return { ...c, subcategories: [...c.subcategories, { name: "", weight: 3, description: "" }] };
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
          <p className="text-sm text-[#737373] mb-6">We'll auto-generate a 3-category scoring rubric from your JD.</p>
          <div className="space-y-5">
            {/* Job title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">Job title <span className="text-red-500">*</span></label>
              <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Backend Engineer — April 2026"
                className="w-full h-11 px-3.5 rounded-xl border border-[#D4D4D4] bg-[#F5F3EE] text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow" />
            </div>

            {/* JD input — paste or upload */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-[#0F0F0F]">Job description <span className="text-red-500">*</span></label>
                {/* Mode toggle */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#F0EDE8] border border-[#D4D4D4]">
                  {(["paste", "upload"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => { setJdInputMode(mode); setJdFile(null); if (mode === "paste") setJdText(""); }}
                      className={`h-6 px-3 rounded-md text-xs font-medium transition-colors ${
                        jdInputMode === mode
                          ? "bg-white text-[#0F0F0F] shadow-sm"
                          : "text-[#737373] hover:text-[#404040]"
                      }`}
                    >
                      {mode === "paste" ? "Paste" : "Upload file"}
                    </button>
                  ))}
                </div>
              </div>

              {jdInputMode === "paste" ? (
                <>
                  <textarea id="jd" rows={10} value={jdText} onChange={(e) => setJdText(e.target.value)}
                    placeholder="Paste your full job description here..."
                    className="w-full px-3.5 py-3 rounded-xl border border-[#D4D4D4] bg-[#F5F3EE] text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow resize-none" />
                  <p className="mt-1 text-xs text-[#A0A0A0]">{jdText.length} characters</p>
                </>
              ) : (
                /* File upload mode */
                extractingJD ? (
                  <div className="border border-[#D4D4D4] rounded-xl p-6 flex items-center gap-3 bg-[#FAFAF8]">
                    <div className="h-5 w-5 rounded-full border-2 border-[#C85A17] border-t-transparent animate-spin shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#0F0F0F]">Extracting text…</p>
                      <p className="text-xs text-[#737373] mt-0.5 truncate max-w-xs">{jdFile?.name}</p>
                    </div>
                  </div>
                ) : jdFile && jdText ? (
                  <div className="border border-green-200 bg-green-50 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5l2.5 2.5L11 4"/></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-green-800 truncate">{jdFile.name}</p>
                        <p className="text-xs text-green-700 mt-0.5">{jdText.length.toLocaleString()} characters extracted</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setJdFile(null); setJdText(""); }}
                        className="text-xs text-green-700 hover:text-red-600 underline shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setJdFileDragActive(true); }}
                    onDragLeave={() => setJdFileDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault(); setJdFileDragActive(false);
                      const f = e.dataTransfer.files[0];
                      if (f && (f.name.endsWith(".pdf") || f.name.endsWith(".docx"))) handleJDFileSelect(f);
                    }}
                    onClick={() => jdFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      jdFileDragActive ? "border-[#C85A17] bg-[#C85A1708]" : "border-[#D4D4D4] hover:border-[#A0A0A0] hover:bg-[#F5F3EE]"
                    }`}
                  >
                    <input ref={jdFileInputRef} type="file" accept=".pdf,.docx" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleJDFileSelect(f); }} />
                    <div className="h-10 w-10 rounded-full bg-[#F5F3EE] border border-[#D4D4D4] flex items-center justify-center mx-auto mb-3">
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v10M6 7l4-4 4 4"/><path d="M3 15h14"/></svg>
                    </div>
                    <p className="text-sm font-medium text-[#0F0F0F] mb-1">Drop your JD file here</p>
                    <p className="text-xs text-[#737373]">or click to browse</p>
                    <p className="text-xs font-semibold text-[#A0A0A0] mt-2 uppercase tracking-wide">PDF or DOCX · single file</p>
                  </div>
                )
              )}
            </div>

            <button onClick={handleAnalyzeJD}
              disabled={!title.trim() || !jdText.trim() || analyzingJD || extractingJD}
              className="w-full h-11 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
              {analyzingJD && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {analyzingJD ? "Analyzing job description..." : "Generate scoring rubric →"}
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
            return (
              <div key={cat.name} className={`rounded-2xl border-2 overflow-hidden ${color.border}`}>
                {/* Category header */}
                <div className={`px-5 py-4 ${color.bg} flex items-center justify-between`}>
                  <div className="flex items-center gap-2.5">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color.dot }} />
                    <h3 className={`text-sm font-bold ${color.text}`}>{cat.name}</h3>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-[180px]">
                    <input
                      type="range"
                      min={0} max={100} step={5}
                      value={cat.weight}
                      onChange={(e) => updateCategoryWeight(catIdx, Number(e.target.value))}
                      className="weight-slider flex-1"
                      style={{ background: `linear-gradient(to right, #0F0F0F ${cat.weight}%, #E8E5DF ${cat.weight}%)` }}
                    />
                    <span className="text-sm font-bold text-[#0F0F0F] w-10 text-right">{cat.weight}%</span>
                  </div>
                </div>

                {/* Subcategories */}
                <div className="bg-white p-4 space-y-3">
                  {cat.subcategories.length === 0 && (
                    <p className="text-xs text-[#A0A0A0] text-center py-3">No subcategories. Click below to add one.</p>
                  )}

                  {cat.subcategories.map((sub, subIdx) => (
                    <div key={subIdx} className={`rounded-xl p-3.5 border ${sub.is_non_negotiable ? "border-red-300 bg-red-50/40" : "border-[#E8E5DF]"}`}>
                      {/* Badges */}
                      {(sub.is_non_negotiable || sub.is_external_context) && (
                        <div className="flex items-center gap-1.5 mb-2">
                          {sub.is_non_negotiable && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><polygon points="4,0 8,8 0,8"/></svg>
                              Must Have
                            </span>
                          )}
                          {sub.is_external_context && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                              <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 1.5C6 4 5 6 5 8s1 4 3 6.5M8 1.5C10 4 11 6 11 8s-1 4-3 6.5M1.5 8h13"/></svg>
                              External Signal
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0 space-y-2">
                          <input
                            type="text"
                            value={sub.name}
                            onChange={(e) => updateSubcategory(catIdx, subIdx, { name: e.target.value })}
                            placeholder="Subcategory name"
                            disabled={sub.is_external_context}
                            className="w-full text-sm font-medium text-[#0F0F0F] bg-white border border-[#E8E5DF] rounded-md px-2.5 py-1.5 hover:border-[#A0A0A0] focus:border-[#C85A17] focus:ring-1 focus:ring-[#C85A17]/20 focus:outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[#F5F4F1]"
                          />
                          <input
                            type="text"
                            value={sub.description}
                            onChange={(e) => updateSubcategory(catIdx, subIdx, { description: e.target.value })}
                            placeholder="Brief description of what to evaluate..."
                            className="w-full text-xs text-[#737373] bg-white border border-[#E8E5DF] rounded-md px-2.5 py-1.5 hover:border-[#A0A0A0] focus:border-[#C85A17] focus:ring-1 focus:ring-[#C85A17]/20 focus:outline-none transition-colors"
                          />
                        </div>
                        {/* Importance 1–5 picker */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1">
                              {([1, 2, 3, 4, 5] as const).map((lvl) => (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => updateSubcategory(catIdx, subIdx, { weight: lvl })}
                                  title={["Low", "Moderate", "Standard", "Important", "Critical"][lvl - 1]}
                                  className={`h-6 w-6 rounded-md text-xs font-bold transition-colors ${
                                    lvl <= sub.weight
                                      ? "bg-[#0F0F0F] text-white"
                                      : "bg-[#F0EDE8] text-[#A0A0A0] hover:bg-[#E8E5DF]"
                                  }`}
                                >
                                  {lvl}
                                </button>
                              ))}
                            </div>
                            <span className="text-[10px] text-[#A0A0A0] font-medium">
                              {["Low", "Moderate", "Standard", "Important", "Critical"][sub.weight - 1] ?? ""}
                            </span>
                          </div>
                          <button
                            onClick={() => removeSubcategory(catIdx, subIdx)}
                            title="Delete subcategory"
                            className="h-7 w-7 rounded-lg border border-[#E8E5DF] text-[#737373] hover:text-red-600 hover:border-red-300 hover:bg-red-50 flex items-center justify-center transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add subcategory */}
                  {cat.subcategories.length < 5 ? (
                    <button
                      onClick={() => addSubcategory(catIdx)}
                      className="w-full mt-1 rounded-xl border border-dashed border-[#D4D4D4] hover:border-[#0F0F0F] hover:bg-[#FAFAF7] py-3 text-sm text-[#737373] hover:text-[#0F0F0F] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 1v10M1 6h10" /></svg>
                      Add subcategory
                    </button>
                  ) : (
                    <p className="text-xs text-[#A0A0A0] text-center pt-1">Maximum 5 subcategories per category</p>
                  )}
                  <p className="text-xs text-[#A0A0A0] text-right pt-0.5">Importance is normalised during scoring</p>
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
