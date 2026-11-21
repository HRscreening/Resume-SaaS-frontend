import { useUndoRedo } from "@/hooks/useUndoRedo";
import { RubricHistoryControls } from "@/components/screening/RubricHistoryControls";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useErrorToast } from "@/lib/useErrorToast";
import { createJobNew, parseJDFile, updateRubric } from "@/lib/api";
import type { Rubric, Subcategory } from "@/types";
import { MAX_SUBCATEGORIES } from "@/lib/rubric";
import { StepIndicator } from "@/components/screening/new-screening/StepIndicator";
import { JdInputStep } from "@/components/screening/new-screening/JdInputStep";
import { RubricReviewStep } from "@/components/screening/new-screening/RubricReviewStep";
import { AskSourceJobModal } from "@/components/screening/new-screening/AskSourcingModal";
import { AnalyticsEvent, useAnalytics } from "@/analytics";
import { useGuide, GuideId } from "@/guides"
import { detectCountry } from "@/lib/currency";
// import sampleRubric from "../../trash/sample_rubric.json"

type Step = 1 | 2;
type JdInputMode = "paste" | "upload" | "ai";

const STEPS = ["Job description", "Review rubric", "Start screening"] as const;

// New-job wizard controller. Owns all wizard state and rubric mutations; the
// per-step UI lives in src/components/screening/new-screening/*.
export default function NewScreening() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showError = useErrorToast();
  const [step, setStep] = useState<Step>(1);

  const analytics = useAnalytics();
  const guide = useGuide()
  const hasTrackedAbandonment = useRef(false);

  // Step 1 — job description input
  const [title, setTitle] = useState("");
  const [jdText, setJdText] = useState("");
  const [jdInputMode, setJdInputMode] = useState<JdInputMode>("upload");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [analyzingJD, setAnalyzingJD] = useState(false);
  const [showSourcingModal, setShowSourcingModal] = useState(false);
  const [screeningId, setScreeningId] = useState<string | null>(null);
  const creatingRef = useRef(false);
  const savingRef = useRef(false);
  const [extractingJD, setExtractingJD] = useState(false);

  // Step 2 — rubric editor
  const rubricHistory = useUndoRedo<Rubric | null>(null);
  const { value: rubric, set: setRubric } = rubricHistory;
  // const [rubric, setRubric] = useState<Rubric | null>(sampleRubric as Rubric);
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

  useEffect(() => {
    if (step == 1) {
      guide.startGuide("new_job")
    }
  }, [])

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

  function handleAnalyze() {
    if (detectCountry() === "IN") {
      setShowSourcingModal(true);
      return;
    }
    void handleCreateJob(false);
  }

  async function handleCreateJob(sourceJob: boolean) {
    if (creatingRef.current || screeningId || extractingJD) return;
    if (!title.trim()) {
      analytics.track(AnalyticsEvent.JOB_CREATION_VALIDATION_FAILED, { reason: "missing_title" });
      return;
    }
    if (!jdText.trim()) {
      analytics.track(AnalyticsEvent.JOB_CREATION_VALIDATION_FAILED, { reason: "missing_jd" });
      return;
    }
    creatingRef.current = true;
    setShowSourcingModal(false);
    setAnalyzingJD(true);
    analytics.track(AnalyticsEvent.JD_GENERATION_STARTED, { inputMode: jdInputMode });
    try {
      const data = new FormData();
      data.append("title", title.trim());
      data.append("raw_jd_text", jdText);
      data.append("source_job", String(sourceJob));
      if (jdFile) data.append("jd_file", jdFile, jdFile.name);
      const { screening_id, rubric: result } = await createJobNew(data);
      setScreeningId(screening_id);
      hasTrackedAbandonment.current = true;
      analytics.track(AnalyticsEvent.JOB_SOURCING_ALLOWED, { allowed: sourceJob });
      analytics.track(AnalyticsEvent.JOB_CREATED, { jobId: screening_id, source: "dashboard" });
      queryClient.invalidateQueries({ queryKey: ["screenings"] });
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
      rubricHistory.reset(sorted);
      analytics.track(AnalyticsEvent.RUBRIC_GENERATION_COMPLETED, { categoryCount: sorted.categories.length });
      analytics.track(AnalyticsEvent.JOB_CREATION_STEP_VIEWED, { step: "rubric" });
      setStep(2);
    } catch (err) {
      analytics.track(AnalyticsEvent.JD_GENERATION_FAILED, { inputMode: jdInputMode });
      analytics.track(AnalyticsEvent.JOB_CREATION_FAILED, { reason: "jd_generation" });
      showError(err, err instanceof Error ? err.message : "Failed to create job");
    } finally {
      creatingRef.current = false;
      setAnalyzingJD(false);
    }
  }

  function updateCategoryWeight(catIdx: number, weight: number) {
    if (!rubric) return;
    const updated = rubric.categories.map((c, i) => (i === catIdx ? { ...c, weight } : c));
    setRubric({ ...rubric, categories: updated }, `category:${catIdx}:weight`);
    analytics.track(AnalyticsEvent.RUBRIC_EDITED, { editType: "category_weight" });
  }

  function updateSubcategory(catIdx: number, subIdx: number, updates: Partial<Subcategory>) {
    if (!rubric) return;
    const updated = rubric.categories.map((cat, ci) => {
      if (ci !== catIdx) return cat;
      const subs = cat.subcategories.map((s, si) => (si === subIdx ? { ...s, ...updates } : s));
      return { ...cat, subcategories: subs };
    });
    setRubric({ ...rubric, categories: updated }, `subcategory:${catIdx}:${subIdx}:${Object.keys(updates).sort().join(",")}`);
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

  async function handleSaveJob() {
    if (!screeningId || !rubric || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await updateRubric(screeningId, rubric);
      queryClient.invalidateQueries({ queryKey: ["screenings"] });
      queryClient.invalidateQueries({ queryKey: ["screening", screeningId] });
      navigate({ to: "/screenings/$id", params: { id: screeningId } });
    } catch (err) {
      analytics.track(AnalyticsEvent.JOB_CREATION_FAILED, { reason: "job_save" });
      showError(err, err instanceof Error ? err.message : "Failed to save rubric");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
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
          onAnalyze={handleAnalyze}
        />
      )}

      {showSourcingModal && (
        <AskSourceJobModal
          onSave={handleCreateJob}
          onClose={() => setShowSourcingModal(false)}
        />
      )}

      {step === 2 && rubric && (
        <fieldset disabled={saving} className="min-w-0" {...rubricHistory.editorProps(!saving)}>
          <RubricHistoryControls {...rubricHistory} disabled={saving} />
        <RubricReviewStep
          rubric={rubric}
          onCategoryWeightChange={updateCategoryWeight}
          onSubcategoryChange={updateSubcategory}
          onRemoveSubcategory={removeSubcategory}
          onAddSubcategory={addSubcategory}
          onSave={handleSaveJob}
          saving={saving}
        />
        </fieldset>
      )}
    </div>
  );
}
