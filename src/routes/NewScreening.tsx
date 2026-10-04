import { useState,useEffect,useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { analyzeJD, createJob, createJob_v1, parseJDFile } from "@/lib/api";
import type { Rubric, Subcategory } from "@/types";
import { MAX_SUBCATEGORIES } from "@/lib/rubric";
import { StepIndicator } from "@/components/screening/new-screening/StepIndicator";
import { JdInputStep } from "@/components/screening/new-screening/JdInputStep";
import { RubricReviewStep } from "@/components/screening/new-screening/RubricReviewStep";
import { AnalyticsEvent, useAnalytics } from "@/analytics";


type Step = 1 | 2;
type JdInputMode = "paste" | "upload" | "ai";

const STEPS = ["Job description", "Review rubric"] as const;

// New-job wizard controller. Owns all wizard state and rubric mutations; the
// per-step UI lives in src/components/screening/new-screening/*.
export default function NewScreening() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);

  const analytics = useAnalytics();
  const hasTrackedAbandonment = useRef(false);

  // Step 1 — job description input
  const [title, setTitle] = useState("");
  const [jdText, setJdText] = useState("");
  const [jdInputMode, setJdInputMode] = useState<JdInputMode>("paste");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [analyzingJD, setAnalyzingJD] = useState(false);
  const [extractingJD, setExtractingJD] = useState(false);

  // Step 2 — rubric editor
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [saving, setSaving] = useState(false);
  const draftRef = useRef({ step, title: "", jdText: "", hasRubric: false, saving: false });
  draftRef.current = { step, title, jdText, hasRubric: Boolean(rubric), saving };

  useEffect(() => {
    analytics.page();
    analytics.track(AnalyticsEvent.JOB_CREATION_VIEWED, { source: "direct" });
    analytics.track(AnalyticsEvent.JOB_CREATION_STEP_VIEWED, { step: "jd" });
    return () => {
      if (hasTrackedAbandonment.current) return;
      hasTrackedAbandonment.current = true;
      const draft = draftRef.current;
      if (!draft.saving) {
        analytics.track(AnalyticsEvent.JOB_CREATION_ABANDONED, {
          step: draft.step === 2 || draft.hasRubric ? "rubric" : "jd",
          hasTitle: Boolean(draft.title.trim()),
          hasJd: Boolean(draft.jdText.trim()),
        });
      }
    };
  }, [analytics]);

  function handleModeChange(mode: JdInputMode) {
    setJdInputMode(mode);
    setJdFile(null);
    // Start fresh when switching to paste or AI; upload keeps any extracted
    // text until a new file is chosen.
    if (mode === "paste" || mode === "ai") setJdText("");
    analytics.track(AnalyticsEvent.JD_INPUT_MODE_CHANGED, { mode });
  }

  async function handleJDFileSelect(file: File) {
    setJdFile(file);
    setJdText("");
    setExtractingJD(true);
    try {
      const { text } = await parseJDFile(file);
      setJdText(text);
      analytics.track(AnalyticsEvent.JD_FILE_UPLOADED, {
        fileType: file.name.split(".").pop()?.toLowerCase() ?? "unknown",
      });
    } catch (err) {
      analytics.track(AnalyticsEvent.JOB_CREATION_FAILED, { reason: "jd_extraction" });
      toast.error(err instanceof Error ? err.message : "Could not extract text from file");
      setJdFile(null);
    } finally {
      setExtractingJD(false);
    }
  }

  function handleRemoveFile() {
    setJdFile(null);
    setJdText("");
  }

  async function handleAnalyzeJD() {
    if (!jdText.trim()) {
      analytics.track(AnalyticsEvent.JOB_CREATION_VALIDATION_FAILED, { reason: "missing_jd" });
      return;
    }
    if (analyzingJD) return;
    setAnalyzingJD(true);
    analytics.track(AnalyticsEvent.JD_GENERATION_STARTED, { inputMode: jdInputMode });
    try {
      const result = await analyzeJD(jdText);
      analytics.track(AnalyticsEvent.JD_GENERATION_COMPLETED, { inputMode: jdInputMode });
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
      analytics.track(AnalyticsEvent.RUBRIC_GENERATION_COMPLETED, { categoryCount: sorted.categories.length });
      analytics.track(AnalyticsEvent.JOB_CREATION_STEP_VIEWED, { step: "rubric" });
      setStep(2);
    } catch (err) {
      analytics.track(AnalyticsEvent.JD_GENERATION_FAILED, { inputMode: jdInputMode });
      analytics.track(AnalyticsEvent.JOB_CREATION_FAILED, { reason: "jd_generation" });
      toast.error(err instanceof Error ? err.message : "Failed to analyze JD");
    } finally {
      setAnalyzingJD(false);
    }
  }

  function updateCategoryWeight(catIdx: number, weight: number) {
    if (!rubric) return;
    const updated = rubric.categories.map((c, i) => (i === catIdx ? { ...c, weight } : c));
    setRubric({ ...rubric, categories: updated });
    analytics.track(AnalyticsEvent.RUBRIC_EDITED, { editType: "category_weight" });
  }

  function updateSubcategory(catIdx: number, subIdx: number, updates: Partial<Subcategory>) {
    if (!rubric) return;
    const updated = rubric.categories.map((cat, ci) => {
      if (ci !== catIdx) return cat;
      const subs = cat.subcategories.map((s, si) => (si === subIdx ? { ...s, ...updates } : s));
      return { ...cat, subcategories: subs };
    });
    setRubric({ ...rubric, categories: updated });
    analytics.track(AnalyticsEvent.RUBRIC_EDITED, { editType: "subcategory" });
  }

  function removeSubcategory(catIdx: number, subIdx: number) {
    if (!rubric) return;
    const updated = rubric.categories.map((cat, ci) => {
      if (ci !== catIdx) return cat;
      return { ...cat, subcategories: cat.subcategories.filter((_, si) => si !== subIdx) };
    });
    setRubric({ ...rubric, categories: updated });
    analytics.track(AnalyticsEvent.RUBRIC_EDITED, { editType: "remove" });
  }

  function addSubcategory(catIdx: number) {
    if (!rubric) return;
    if (rubric.categories[catIdx].subcategories.length >= MAX_SUBCATEGORIES) return;
    const updated = rubric.categories.map((c, ci) => {
      if (ci !== catIdx) return c;
      return { ...c, subcategories: [...c.subcategories, { name: "", weight: 3, description: "" }] };
    });
    setRubric({ ...rubric, categories: updated });
    analytics.track(AnalyticsEvent.RUBRIC_EDITED, { editType: "add" });
  }

  async function handleSaveJob(sourceJob: boolean) {
    if (!title.trim()) {
      analytics.track(AnalyticsEvent.JOB_CREATION_VALIDATION_FAILED, { reason: "missing_title" });
      return;
    }
    if (!rubric) {
      analytics.track(AnalyticsEvent.JOB_CREATION_VALIDATION_FAILED, { reason: "missing_rubric" });
      return;
    }
    setSaving(true);
    try {
      const data = new FormData();
      // const data = {
      //   title: title.trim(),
      //   raw_jd_text: jdText,
      //   rubric,
      //   source_job: sourceJob || false,
      // }

      data.append("title", title);
      data.append("raw_jd_text", jdText);
      data.append("rubric", JSON.stringify(rubric));
      data.append("source_job", sourceJob ? "true" : "false");
      if (rubric.job_category) {
        data.append("job_category", rubric.job_category);
      }
      if (rubric.job_market_scope) {
        data.append("job_market_scope", rubric.job_market_scope);
      }


      if (jdFile) {
        data.append("jd_file", jdFile, jdFile.name);
      }
      // console.log("Saving job with data:", data);

      const { screening_id } = await createJob_v1(data);
      hasTrackedAbandonment.current = true;
      analytics.track(AnalyticsEvent.JOB_SOURCING_ALLOWED, { allowed: sourceJob });
      analytics.track(AnalyticsEvent.JOB_CREATED, { jobId: screening_id, source: "dashboard" });
      queryClient.invalidateQueries({ queryKey: ["screenings"] });
      navigate({ to: "/screenings/$id", params: { id: screening_id } });
    } catch (err) {
      analytics.track(AnalyticsEvent.JOB_CREATION_FAILED, { reason: "job_save" });
      toast.error(err instanceof Error ? err.message : "Failed to save job");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F0F0F] mb-4">New Job</h1>
        <StepIndicator current={step} steps={STEPS} />
      </div>

      {step === 1 && (
        <JdInputStep
          title={title}
          onTitleChange={setTitle}
          jdText={jdText}
          onJdTextChange={setJdText}
          mode={jdInputMode}
          onModeChange={handleModeChange}
          jdFile={jdFile}
          extracting={extractingJD}
          onFileSelect={handleJDFileSelect}
          onRemoveFile={handleRemoveFile}
          analyzing={analyzingJD}
          onAnalyze={handleAnalyzeJD}
        />
      )}

      {step === 2 && rubric && (
        <RubricReviewStep
          rubric={rubric}
          onCategoryWeightChange={updateCategoryWeight}
          onSubcategoryChange={updateSubcategory}
          onRemoveSubcategory={removeSubcategory}
          onAddSubcategory={addSubcategory}
          onBack={() => {
            setStep(1);
            analytics.track(AnalyticsEvent.JOB_CREATION_STEP_VIEWED, { step: "jd" });
          }}
          onSave={handleSaveJob}
          saving={saving}
        />
      )}
    </div>
  );
}
