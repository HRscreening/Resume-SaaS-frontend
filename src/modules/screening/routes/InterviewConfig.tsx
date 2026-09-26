import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BackLink } from "@/components/layout/BackLink";
import {
  getScreening,
  getInterviewConfig,
  saveInterviewConfig,
  generateQuestionPlan,
} from "@/lib/api";
import { InvitePanel } from "@/modules/screening/components/interview/InvitePanel";
import type { Rubric, InterviewConfig, InterviewMode, QuestionPlanItem } from "@/types";
import { truncate } from "@/lib/utils";
import { useAccount } from "@/hooks/useAccount";
import { sortedStages } from "@/lib/stages";

const DEFAULT_CONFIG: InterviewConfig = {
  // Derived from the question plan at save time (see `effectiveEnabled`
  // below), never set directly by a control here — the API refuses an
  // enabled config with an empty plan, so the UI never offers that state.
  enabled: false,
  mode: "open",
  target_minutes: 50,
  cap_minutes: 60,
  question_plan: [],
  hiring_company: "",
  voice: { tts_voice_id: "default", tier: "default" },
  role_facts: [],
  entry_stage: "Shortlisted",
  ai_assistance: "closed",
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

const MODE_OPTIONS: { value: InterviewMode; label: string; body: string; comingSoon: boolean }[] = [
  {
    value: "open",
    label: "Open conversation",
    body: "The agent asks your question plan and adjusts follow-ups to the answers. Available today.",
    comingSoon: false,
  },
  {
    value: "coding",
    label: "Coding",
    body: "A live coding surface with run and submit. Not built yet.",
    comingSoon: true,
  },
  {
    value: "system_design",
    label: "System design",
    body: "A whiteboard-style design discussion. Not built yet.",
    comingSoon: true,
  },
];

export default function InterviewConfigPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const { canWrite } = useAccount();
  const queryClient = useQueryClient();

  const { data: screening, isLoading: screeningLoading } = useQuery({
    queryKey: ["screening", id],
    queryFn: () => getScreening(id),
  });

  const { data: configResp, isLoading: configLoading } = useQuery({
    queryKey: ["interview-config", id],
    queryFn: () => getInterviewConfig(id),
  });

  const competencies = useMemo(
    () => interviewableCompetencies((screening?.rubric as Rubric | null) ?? null),
    [screening],
  );
  const stages = useMemo(() => sortedStages(screening?.stages), [screening]);

  const [draft, setDraft] = useState<InterviewConfig>(DEFAULT_CONFIG);
  const [hydrated, setHydrated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (hydrated || configLoading) return;
    const saved = configResp?.config;
    setDraft({ ...DEFAULT_CONFIG, ...(saved ?? {}) });
    setIsEditing(Boolean(saved?.enabled && (saved.question_plan?.length ?? 0) > 0));
    setHydrated(true);
  }, [hydrated, configLoading, configResp]);

  // What the API actually has saved right now — the invite panel acts on
  // this, not on `draft`, because /interview/invites reads the persisted
  // config, not whatever is unsaved on screen.
  const savedConfig = configResp?.config ?? null;
  const savedReady = Boolean(savedConfig?.enabled && (savedConfig.question_plan?.length ?? 0) > 0);

  const generateMutation = useMutation({
    mutationFn: () => generateQuestionPlan(id, "interview"),
    onSuccess: (res) => {
      setDraft((d) => ({ ...d, question_plan: res.question_plan }));
      toast.success(`Generated ${res.question_plan.length} questions`);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not generate question plan"),
  });

  // The API refuses enabled:true with an empty plan or a mode other than
  // "open" (app/schemas/interview.py). Deriving `enabled` here — rather than
  // exposing a checkbox — makes that combination unreachable from this
  // screen, the same way VoiceConfig's hidden toggle does for the phone round.
  const effectiveEnabled = draft.mode === "open" && draft.question_plan.length > 0;

  const saveMutation = useMutation({
    mutationFn: () => saveInterviewConfig(id, { ...draft, enabled: effectiveEnabled }),
    onSuccess: (res) => {
      queryClient.setQueryData(["interview-config", id], res);
      setDraft(res.config);
      setIsEditing(true);
      toast.success("Interview round saved");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not save interview config"),
  });

  const saveBlockers: string[] = [];
  if (draft.target_minutes > draft.cap_minutes) {
    saveBlockers.push("Target minutes cannot exceed the cap.");
  }
  if (!draft.entry_stage.trim()) {
    saveBlockers.push("Pick a kanban stage candidates must reach to be invite-eligible.");
  }

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
        { text: "", competency_ref: competencies[0] ?? "", expected_signals: [], weight: 1 },
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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-28">
      <BackLink
        to="/screenings/$id"
        params={{ id }}
        search={{ tab: "Screening" }}
        label="screening"
        className="mb-2"
      />

      <div className="flex items-center gap-2 mb-2 text-xs">
        <Link to="/screenings" className="text-[#737373] hover:text-[#0F0F0F]">Screenings</Link>
        <span className="text-[#D4D4D4]">/</span>
        <Link to="/screenings/$id" params={{ id }} className="text-[#737373] hover:text-[#0F0F0F]">
          {truncate(screening.title, 32)}
        </Link>
        <span className="text-[#D4D4D4]">/</span>
        <span className="text-[#404040]">Interview round</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold text-[#0F0F0F]">
              {isEditing ? "Edit interview round" : "Set up interview round"}
            </h1>
            {isEditing && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Configured
              </span>
            )}
          </div>
          <p className="text-sm text-[#737373]">
            A candidate joins from their browser for a structured, hour-long AI interview with
            live captions, then a worker scores the transcript.
          </p>
        </div>
      </div>

      {!canWrite && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs leading-relaxed text-amber-800">
            Read-only: you can view this interview round but not change it.
          </p>
        </div>
      )}

      {/* ── 1. Mode ─────────────────────────────────────────────────────── */}
      <Step n={1} title="Interview mode" hint="What kind of work surface the candidate sees.">
        <div className="grid gap-3 sm:grid-cols-3">
          {MODE_OPTIONS.map((opt) => {
            const active = draft.mode === opt.value;
            const disabled = !canWrite || opt.comingSoon;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                title={opt.comingSoon ? "Coming soon" : undefined}
                onClick={() => {
                  if (opt.comingSoon || active) return;
                  setDraft((d) => ({ ...d, mode: opt.value }));
                }}
                className={`rounded-xl border p-3.5 text-left transition-colors ${
                  active
                    ? "border-[#0F0F0F] bg-[#0F0F0F] text-white"
                    : opt.comingSoon
                      ? "border-[#E8E5DF] bg-[#FAFAF8] opacity-60 cursor-not-allowed"
                      : "border-[#D4D4D4] bg-white hover:border-[#0F0F0F]/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{opt.label}</span>
                  {opt.comingSoon && (
                    <span className="rounded-full bg-[#E8E5DF] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#737373]">
                      Coming soon
                    </span>
                  )}
                </div>
                <p className={`mt-1.5 text-xs leading-relaxed ${active ? "text-white/70" : "text-[#737373]"}`}>
                  {opt.body}
                </p>
              </button>
            );
          })}
        </div>
      </Step>

      {/* ── 2. Timing ───────────────────────────────────────────────────── */}
      <Step n={2} title="Timing" hint="How long the interview aims to run, and the hard ceiling it may never pass.">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Target minutes</label>
            <input
              type="number" min={10} max={120}
              value={draft.target_minutes}
              onChange={(e) => setDraft((d) => ({ ...d, target_minutes: Number(e.target.value) }))}
              disabled={!canWrite}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Cap minutes</label>
            <input
              type="number" min={10} max={180}
              value={draft.cap_minutes}
              onChange={(e) => setDraft((d) => ({ ...d, cap_minutes: Number(e.target.value) }))}
              disabled={!canWrite}
              className={inputCls}
            />
          </div>
        </div>
        {draft.target_minutes > draft.cap_minutes && (
          <p className="mt-1.5 text-xs text-red-600">Target minutes cannot exceed the cap.</p>
        )}
      </Step>

      {/* ── 3. Who is interviewing ──────────────────────────────────────── */}
      <Step n={3} title="Who is interviewing" hint="Named in the agent's introduction, same as the phone round.">
        <label className={labelCls}>Hiring company</label>
        <input
          value={draft.hiring_company ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, hiring_company: e.target.value }))}
          placeholder="e.g. Acme Corp"
          disabled={!canWrite}
          className={inputCls}
        />
      </Step>

      {/* ── 4. Questions ────────────────────────────────────────────────── */}
      <Step
        n={4}
        title="Questions"
        hint="Expected answer and grading notes are scorer-only — the agent never reads them aloud."
        aside={
          <span className="text-xs text-[#737373]">
            {new Set(draft.question_plan.map((q) => q.competency_ref)).size}/{competencies.length} competencies
          </span>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {/* Once a plan has been saved, candidates may already hold invite
              links whose interview reads this config live at join time (there
              is no per-invite snapshot) — regenerating out from under them
              would change their questions without warning. So, like Voice,
              generation is offered only until the round is first saved. */}
          {canWrite && !(isEditing && draft.question_plan.length > 0) && (
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="h-9 px-4 border border-[#0F0F0F] bg-[#0F0F0F] text-white text-xs font-medium rounded-xl hover:bg-[#262626] transition-colors disabled:opacity-60"
            >
              {generateMutation.isPending
                ? "Generating…"
                : draft.question_plan.length
                  ? "Regenerate from JD + rubric"
                  : "Generate from JD + rubric"}
            </button>
          )}
          {canWrite && (
            <button
              onClick={addQuestion}
              className="h-9 px-4 border border-[#D4D4D4] text-xs font-medium text-[#404040] rounded-xl hover:bg-white transition-colors"
            >
              + Add question
            </button>
          )}
          {!isEditing && draft.question_plan.length > 0 && (
            <span className="text-xs text-[#737373]">Regenerating replaces the list below.</span>
          )}
          {isEditing && draft.question_plan.length > 0 && (
            <span className="text-xs text-[#737373]">
              Edit the wording below. This plan may already be in a candidate&rsquo;s hands, so it
              is no longer regenerated from scratch.
            </span>
          )}
        </div>

        <div className="space-y-2.5">
          {draft.question_plan.map((q, idx) => (
            <div key={idx} className="group rounded-xl border border-[#E8E5DF] bg-white">
              <div className="flex items-start gap-3 px-3.5 pt-3">
                <span className="mt-0.5 shrink-0 text-xs font-bold tabular-nums text-[#C85A17]">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <textarea
                  value={q.text}
                  onChange={(e) => updateQuestion(idx, { text: e.target.value })}
                  rows={2}
                  placeholder="Question the agent will ask, word for word"
                  aria-label={`Question ${idx + 1} text`}
                  disabled={!canWrite}
                  className="min-h-0 flex-1 resize-none rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm leading-relaxed text-[#0F0F0F] transition-colors placeholder:text-[#A3A3A3] hover:border-[#E8E5DF] hover:bg-[#FAFAF8] focus:border-[#0F0F0F] focus:bg-white focus:outline-none [field-sizing:content]"
                />
                {canWrite && (
                  <button
                    onClick={() => removeQuestion(idx)}
                    aria-label="Remove question"
                    title="Remove question"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#D4D4D4] transition-colors hover:bg-red-50 hover:text-red-600 group-hover:text-[#737373]"
                  >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M2 2l8 8M10 2l-8 8" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="mt-2 flex flex-col gap-2 border-t border-[#F0EEE8] px-3.5 py-2 sm:flex-row sm:items-center">
                <select
                  value={q.competency_ref}
                  onChange={(e) => updateQuestion(idx, { competency_ref: e.target.value })}
                  title="Competency this question assesses"
                  disabled={!canWrite}
                  className="h-7 w-fit max-w-full shrink-0 cursor-pointer rounded-md bg-[#F5F3EE] px-2 pr-6 text-xs font-medium text-[#404040] focus:outline-none"
                >
                  {!competencies.includes(q.competency_ref) && q.competency_ref && (
                    <option value={q.competency_ref}>{q.competency_ref} (not in rubric)</option>
                  )}
                  {competencies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                    Listen for
                  </span>
                  <input
                    value={q.expected_signals.join(", ")}
                    onChange={(e) =>
                      updateQuestion(idx, {
                        expected_signals: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="comma-separated, guides the follow-up"
                    disabled={!canWrite}
                    className="h-7 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-xs text-[#404040] transition-colors placeholder:text-[#C9C5BD] hover:border-[#E8E5DF] hover:bg-[#FAFAF8] focus:border-[#0F0F0F] focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                    Weight
                  </span>
                  <input
                    type="number" min={1} max={5}
                    value={q.weight ?? 1}
                    onChange={(e) => updateQuestion(idx, { weight: Number(e.target.value) })}
                    disabled={!canWrite}
                    className="h-7 w-12 rounded-md border border-[#E8E5DF] bg-transparent px-1.5 text-xs text-[#404040] focus:outline-none focus:border-[#0F0F0F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 border-t border-[#F0EEE8] px-3.5 py-2.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                    Expected answer <span className="normal-case font-normal">(scorer-only, never spoken)</span>
                  </label>
                  <textarea
                    value={q.expected_answer ?? ""}
                    onChange={(e) => updateQuestion(idx, { expected_answer: e.target.value || null })}
                    rows={2}
                    placeholder="What a strong answer contains"
                    disabled={!canWrite}
                    className="w-full resize-none rounded-lg border border-[#E8E5DF] bg-[#FAFAF8] px-2 py-1.5 text-xs leading-relaxed text-[#404040] placeholder:text-[#A3A3A3] focus:border-[#0F0F0F] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                    Grading notes <span className="normal-case font-normal">(scorer-only, never spoken)</span>
                  </label>
                  <textarea
                    value={q.grading_notes ?? ""}
                    onChange={(e) => updateQuestion(idx, { grading_notes: e.target.value || null })}
                    rows={2}
                    placeholder="How to mark this question"
                    disabled={!canWrite}
                    className="w-full resize-none rounded-lg border border-[#E8E5DF] bg-[#FAFAF8] px-2 py-1.5 text-xs leading-relaxed text-[#404040] placeholder:text-[#A3A3A3] focus:border-[#0F0F0F] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
          {draft.question_plan.length === 0 && (
            <p className="rounded-xl border border-dashed border-[#E8E5DF] py-6 text-center text-sm text-[#737373]">
              No questions yet. Generate a plan from the job description, or add one manually.
              An empty plan cannot be enabled, so this round stays off until you add one.
            </p>
          )}
        </div>
      </Step>

      {/* ── 5. Entry stage ──────────────────────────────────────────────── */}
      <Step n={5} title="Entry stage" hint="The kanban stage a candidate must reach before they can be invited.">
        <select
          value={draft.entry_stage}
          onChange={(e) => setDraft((d) => ({ ...d, entry_stage: e.target.value }))}
          disabled={!canWrite}
          className={inputCls}
        >
          {stages.length === 0 && <option value={draft.entry_stage}>{draft.entry_stage}</option>}
          {stages.map((s) => (
            <option key={s.name} value={s.name}>{s.name}</option>
          ))}
        </select>
      </Step>

      {/* ── Sticky actions ──────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[#E8E5DF] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3 sm:px-6">
          {saveBlockers.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              {saveBlockers.map((msg, i) => (
                <p key={i} className="text-xs leading-relaxed text-amber-800">{msg}</p>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="hidden text-xs text-[#737373] sm:block">
              {draft.question_plan.length > 0
                ? `${draft.question_plan.length} question${draft.question_plan.length === 1 ? "" : "s"} · ${
                    effectiveEnabled ? "Round enabled on save" : "Round stays off until saved with questions"
                  }`
                : "Add at least one question to enable this round."}
            </p>
            <div className="flex items-center gap-3">
              <Link
                to="/screenings/$id"
                params={{ id }}
                search={{ tab: "Screening" }}
                className="h-9 px-4 flex items-center text-sm font-medium text-[#404040] hover:text-[#0F0F0F]"
              >
                Cancel
              </Link>
              {canWrite && (
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || saveBlockers.length > 0}
                  title={saveBlockers.length > 0 ? saveBlockers.join(" ") : undefined}
                  className="h-9 px-5 border border-[#0F0F0F] bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#262626] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saveMutation.isPending ? "Saving…" : isEditing ? "Save changes" : "Save interview round"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Invites ─────────────────────────────────────────────────────── */}
      <div className="mb-24 mt-6">
        <InvitePanel
          screeningId={id}
          entryStage={savedConfig?.entry_stage ?? draft.entry_stage}
          ready={savedReady}
          canWrite={canWrite}
        />
      </div>
    </div>
  );
}

/** One numbered configuration step (mirrors VoiceConfig.tsx's Step). */
function Step({
  n, title, hint, aside, children,
}: {
  n: number; title: string; hint?: string; aside?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-2xl border border-[#E8E5DF] bg-[#FAFAF8] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0F0F0F] text-[10px] font-bold text-white">
            {n}
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[#0F0F0F]">{title}</h2>
            {hint && <p className="mt-0.5 text-xs leading-relaxed text-[#737373]">{hint}</p>}
          </div>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

