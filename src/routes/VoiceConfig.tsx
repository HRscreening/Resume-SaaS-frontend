import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getScreening,
  getVoiceConfig,
  saveVoiceConfig,
  generateQuestionPlan,
} from "@/lib/api";
import type { Rubric, VoiceConfig, QuestionPlanItem } from "@/types";
import { truncate } from "@/lib/utils";

const DEFAULT_CONFIG: VoiceConfig = {
  enabled: false,
  question_plan: [],
  voice: { tts_voice_id: "default", tier: "default" },
  language: "en",
  calling_window: { start: "09:00", end: "21:00", tz: "Asia/Kolkata" },
  default_country_code: "+91",
  retry_policy: { max_attempts: 3, backoff: "exponential" },
  max_concurrent_calls_override: null,
};

const inputCls =
  "w-full h-9 px-3 border border-[#D4D4D4] rounded-lg text-sm text-[#0F0F0F] focus:outline-none focus:border-[#0F0F0F] transition-colors";
const labelCls = "block text-xs font-medium text-[#404040] mb-1";

/** Subcategory names usable as competency tags (excludes external-context). */
function interviewableCompetencies(rubric: Rubric | null): string[] {
  if (!rubric) return [];
  const out: string[] = [];
  for (const cat of rubric.categories ?? []) {
    for (const sub of cat.subcategories ?? []) {
      if ((sub as { is_external_context?: boolean }).is_external_context) continue;
      if (sub.name) out.push(sub.name);
    }
  }
  return out;
}

export default function VoiceConfigPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: screening, isLoading: screeningLoading } = useQuery({
    queryKey: ["screening", id],
    queryFn: () => getScreening(id),
  });

  const { data: configResp, isLoading: configLoading } = useQuery({
    queryKey: ["voice-config", id],
    queryFn: () => getVoiceConfig(id),
  });

  const competencies = useMemo(
    () => interviewableCompetencies((screening?.rubric as Rubric | null) ?? null),
    [screening],
  );

  const [draft, setDraft] = useState<VoiceConfig>(DEFAULT_CONFIG);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate once from the persisted config (or defaults) without clobbering edits.
  useEffect(() => {
    if (hydrated || configLoading) return;
    setDraft(configResp?.voice_config ?? DEFAULT_CONFIG);
    setHydrated(true);
  }, [hydrated, configLoading, configResp]);

  const generateMutation = useMutation({
    mutationFn: () => generateQuestionPlan(id),
    onSuccess: (res) => {
      setDraft((d) => ({ ...d, question_plan: res.question_plan }));
      toast.success(`Generated ${res.question_plan.length} questions`);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not generate question plan"),
  });

  const saveMutation = useMutation({
    mutationFn: () => saveVoiceConfig(id, draft),
    onSuccess: (res) => {
      queryClient.setQueryData(["voice-config", id], res);
      toast.success("Voice round saved");
      navigate({ to: "/screenings/$id", params: { id } });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not save voice config"),
  });

  // ── Immutable question-plan editors ──────────────────────────────────────
  const updateQuestion = (idx: number, patch: Partial<QuestionPlanItem>) =>
    setDraft((d) => ({
      ...d,
      question_plan: d.question_plan.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    }));

  const removeQuestion = (idx: number) =>
    setDraft((d) => ({ ...d, question_plan: d.question_plan.filter((_, i) => i !== idx) }));

  const addQuestion = () =>
    setDraft((d) => ({
      ...d,
      question_plan: [
        ...d.question_plan,
        { text: "", competency_ref: competencies[0] ?? "", expected_signals: [] },
      ],
    }));

  if (screeningLoading || configLoading) {
    return <div className="p-8 text-sm text-[#737373]">Loading…</div>;
  }
  if (!screening) {
    return (
      <div className="p-8">
        <p className="text-sm text-[#737373]">Screening not found.</p>
        <Link to="/screenings" className="text-sm underline mt-2 inline-block">Back to screenings</Link>
      </div>
    );
  }

  const coveredCount = new Set(draft.question_plan.map((q) => q.competency_ref)).size;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 text-xs">
        <Link to="/screenings" className="text-[#737373] hover:text-[#0F0F0F]">Screenings</Link>
        <span className="text-[#D4D4D4]">/</span>
        <Link to="/screenings/$id" params={{ id }} className="text-[#737373] hover:text-[#0F0F0F]">
          {truncate(screening.title, 32)}
        </Link>
        <span className="text-[#D4D4D4]">/</span>
        <span className="text-[#404040]">Voice round</span>
      </div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F0F0F] mb-1">Voice screening round</h1>
          <p className="text-sm text-[#737373]">
            Configure the AI phone screen for shortlisted candidates. Questions are scored on the same rubric as resumes.
          </p>
        </div>
        <Link
          to="/screenings/$id/voice/calls"
          params={{ id }}
          className="shrink-0 h-9 px-4 flex items-center border border-[#D4D4D4] text-xs font-medium text-[#404040] rounded-xl hover:bg-white"
        >
          View calls →
        </Link>
      </div>

      {/* Enable toggle */}
      <label className="flex items-center gap-3 mb-6 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={draft.enabled}
          onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
          className="h-4 w-4 accent-[#0F0F0F]"
        />
        <span className="text-sm font-medium text-[#0F0F0F]">Enable voice round for this screening</span>
      </label>

      {/* Question plan */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-semibold text-[#0F0F0F]">Question plan</h2>
            <p className="text-xs text-[#737373]">
              {coveredCount}/{competencies.length} competencies covered
            </p>
          </div>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="h-9 px-4 border border-[#0F0F0F] bg-[#0F0F0F] text-white text-xs font-medium rounded-xl hover:bg-[#262626] transition-colors disabled:opacity-60"
          >
            {generateMutation.isPending ? "Generating…" : "Generate from JD + rubric"}
          </button>
        </div>

        <div className="space-y-3">
          {draft.question_plan.map((q, idx) => (
            <div key={idx} className="border border-[#E8E5DF] rounded-xl p-3 bg-white">
              <div className="flex items-start gap-2">
                <textarea
                  value={q.text}
                  onChange={(e) => updateQuestion(idx, { text: e.target.value })}
                  rows={2}
                  placeholder="Question text"
                  className="flex-1 px-3 py-2 border border-[#D4D4D4] rounded-lg text-sm text-[#0F0F0F] focus:outline-none focus:border-[#0F0F0F] resize-y"
                />
                <button
                  onClick={() => removeQuestion(idx)}
                  aria-label="Remove question"
                  className="h-8 w-8 shrink-0 flex items-center justify-center text-[#737373] hover:text-red-600 rounded-lg"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <div>
                  <label className={labelCls}>Competency</label>
                  <select
                    value={q.competency_ref}
                    onChange={(e) => updateQuestion(idx, { competency_ref: e.target.value })}
                    className={inputCls}
                  >
                    {!competencies.includes(q.competency_ref) && q.competency_ref && (
                      <option value={q.competency_ref}>{q.competency_ref} (not in rubric)</option>
                    )}
                    {competencies.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Expected signals (comma-separated)</label>
                  <input
                    value={q.expected_signals.join(", ")}
                    onChange={(e) =>
                      updateQuestion(idx, {
                        expected_signals: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          ))}
          {draft.question_plan.length === 0 && (
            <p className="text-sm text-[#737373] py-4 text-center border border-dashed border-[#E8E5DF] rounded-xl">
              No questions yet. Generate a plan or add one manually.
            </p>
          )}
        </div>
        <button
          onClick={addQuestion}
          className="mt-3 h-9 px-4 border border-[#D4D4D4] text-xs font-medium text-[#404040] rounded-xl hover:bg-white transition-colors"
        >
          + Add question
        </button>
      </section>

      {/* Call settings */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div>
          <label className={labelCls}>Voice ID</label>
          <input
            value={draft.voice.tts_voice_id}
            onChange={(e) => setDraft((d) => ({ ...d, voice: { ...d.voice, tts_voice_id: e.target.value } }))}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Voice tier</label>
          <select
            value={draft.voice.tier}
            onChange={(e) =>
              setDraft((d) => ({ ...d, voice: { ...d.voice, tier: e.target.value as "default" | "premium" } }))
            }
            className={inputCls}
          >
            <option value="default">Default</option>
            <option value="premium">Premium</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Default country code</label>
          <input
            value={draft.default_country_code}
            onChange={(e) => setDraft((d) => ({ ...d, default_country_code: e.target.value }))}
            placeholder="+91"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Timezone</label>
          <input
            value={draft.calling_window.tz}
            onChange={(e) => setDraft((d) => ({ ...d, calling_window: { ...d.calling_window, tz: e.target.value } }))}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Calling window start</label>
          <input
            type="time"
            value={draft.calling_window.start}
            onChange={(e) => setDraft((d) => ({ ...d, calling_window: { ...d.calling_window, start: e.target.value } }))}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Calling window end</label>
          <input
            type="time"
            value={draft.calling_window.end}
            onChange={(e) => setDraft((d) => ({ ...d, calling_window: { ...d.calling_window, end: e.target.value } }))}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Retry attempts</label>
          <input
            type="number"
            min={1}
            max={10}
            value={draft.retry_policy.max_attempts}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                retry_policy: { ...d.retry_policy, max_attempts: Number(e.target.value) },
              }))
            }
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Retry backoff</label>
          <select
            value={draft.retry_policy.backoff}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                retry_policy: {
                  ...d.retry_policy,
                  backoff: e.target.value as "exponential" | "linear" | "fixed",
                },
              }))
            }
            className={inputCls}
          >
            <option value="exponential">Exponential</option>
            <option value="linear">Linear</option>
            <option value="fixed">Fixed</option>
          </select>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-[#E8E5DF] pt-4">
        <Link
          to="/screenings/$id"
          params={{ id }}
          className="h-9 px-4 flex items-center text-sm font-medium text-[#404040] hover:text-[#0F0F0F]"
        >
          Cancel
        </Link>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="h-9 px-5 border border-[#0F0F0F] bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#262626] transition-colors disabled:opacity-60"
        >
          {saveMutation.isPending ? "Saving…" : "Save voice round"}
        </button>
      </div>
    </div>
  );
}
