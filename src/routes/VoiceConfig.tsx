import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CountryCodeSelect } from "@/components/ui/CountryCodeSelect";
import { BackLink } from "@/components/layout/BackLink";
import {
  getScreening,
  getVoiceConfig,
  saveVoiceConfig,
  generateQuestionPlan,
} from "@/lib/api";
import type { Rubric, VoiceConfig, QuestionPlanItem, QualificationConfig } from "@/types";
import { truncate } from "@/lib/utils";

const DEFAULT_CONFIG: VoiceConfig = {
  enabled: false,
  question_plan: [],
  hiring_company: "",
  voice: { tts_voice_id: "default", tier: "default" },
  language: "en",
  // TEMPORARY (2026-07-13): default to a 24h window during testing. Restore to
  // { start: "09:00", end: "21:00" } to reinstate quiet hours. The dispatcher
  // also force-allows 24h via HIRESORT_VOICE_24H_WINDOW.
  calling_window: { start: "00:00", end: "23:59", tz: "Asia/Kolkata" },
  default_country_code: "+91",
  retry_policy: { max_attempts: 3, backoff: "exponential" },
  max_concurrent_calls_override: null,
  qualification: {
    budget_band_pct: 10, distance_threshold_km: 100, relocation_required: false,
    ask_notice: true, ask_compensation: true, ask_location: true, role_facts: [],
  },
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
  // True when a voice round was already configured before this visit — flips
  // the page from setup copy ("Voice screening round") to edit copy, so the
  // recruiter can tell at a glance they are changing something that exists.
  const [isEditing, setIsEditing] = useState(false);

  // Hydrate once from the persisted config (or defaults) without clobbering
  // edits. Spread over DEFAULT_CONFIG so configs saved before newer fields
  // still hydrate with defaults.
  useEffect(() => {
    if (hydrated || configLoading) return;
    const saved = configResp?.voice_config;
    setDraft({ ...DEFAULT_CONFIG, ...(saved ?? {}) });
    setIsEditing(Boolean(saved && (saved.enabled || (saved.question_plan?.length ?? 0) > 0)));
    setHydrated(true);
  }, [hydrated, configLoading, configResp]);

  const generateMutation = useMutation({
    mutationFn: () => generateQuestionPlan(id, draft.interview_depth ?? "screening"),
    onSuccess: (res) => {
      let hadFacts = false;
      setDraft((d) => {
        hadFacts = (d.qualification?.role_facts?.length ?? 0) > 0;
        return {
          ...d,
          question_plan: res.question_plan,
          // Remote role: default the location question off (HR can re-enable).
          qualification: {
            ...d.qualification,
            ask_location: res.is_remote_job ? false : (d.qualification?.ask_location ?? true),
            // Prefill shareable facts from the JD, but never overwrite a list the
            // recruiter has already curated.
            role_facts: hadFacts ? d.qualification?.role_facts : (res.role_facts ?? []),
          },
        };
      });
      toast.success(`Generated ${res.question_plan.length} questions`);
      if (!hadFacts && (res.role_facts?.length ?? 0) > 0) {
        toast.info(`Added ${res.role_facts?.length} shareable role facts from the job description`);
      }
      if (res.is_remote_job) {
        toast.info("Job looks remote: location question disabled by default");
      }
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

  // The location stage anchors on the city: onsite/hybrid with the location
  // question (or a relocation knockout) but no city means the agent cannot say
  // where the role is. A live call shipped with exactly this hole, so it blocks
  // the save rather than warns.
  const qual = draft.qualification;
  const needsJobCity =
    (qual?.work_model === "onsite" || qual?.work_model === "hybrid") &&
    ((qual?.ask_location ?? true) || (qual?.relocation_required ?? false)) &&
    !(qual?.job_city ?? "").trim();
  const saveBlockers: string[] = [];
  if (draft.enabled && !(draft.hiring_company ?? "").trim()) {
    saveBlockers.push("Hiring company is required before calls can start.");
  }
  if (draft.enabled && needsJobCity) {
    saveBlockers.push(
      qual?.relocation_required
        ? "Relocation is required, so the agent must be able to name the job city."
        : "The role is " + (qual?.work_model ?? "onsite") + ", so the location question needs a job city.",
    );
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
        { text: "", competency_ref: competencies[0] ?? "", expected_signals: [] },
      ],
    }));

  const setQual = (patch: Partial<QualificationConfig>) =>
    setDraft((d) => ({ ...d, qualification: { ...(d.qualification ?? {}), ...patch } }));

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
  // ── Readiness: what still blocks a first call, surfaced next to the action
  //    rather than discovered after clicking save.
  const stepsDone = {
    company: Boolean(draft.hiring_company?.trim()),
    questions: draft.question_plan.length > 0,
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-28">
      {/* Back out to the job this round belongs to. The breadcrumb below still
          shows the full hierarchy; this is the affordance people actually
          click. */}
      <BackLink
        to="/screenings/$id"
        params={{ id }}
        search={{ tab: "Screening" }}
        label="screening"
        className="mb-2"
      />

      {/* Breadcrumb */}
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
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold text-[#0F0F0F]">
              {isEditing ? "Edit voice round" : "Set up voice round"}
            </h1>
            {isEditing && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Configured
              </span>
            )}
          </div>
          <p className="text-sm text-[#737373]">
            {isEditing
              ? "This screening already has a voice round. Changes apply to the next call you place."
              : "An AI assistant phones shortlisted candidates, asks your questions, and scores the answers."}
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

      {/* ── 1. Interview type ────────────────────────────────────────────────
          Promoted to the first decision because it is the most consequential
          one: it changes how many questions are generated, how technical they
          are, how long the call runs, and how the answers are scored. */}
      <Step n={1} title="Interview type" hint="Sets question count, depth and how answers are scored.">
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            {
              value: "screening",
              label: "Screening",
              lead: "3-4 quick questions",
              body: "Confirms background and basic fit. About 7 to 10 minutes. Scored mainly on whether they understand the work.",
            },
            {
              value: "deep_dive",
              label: "Deep dive",
              lead: "5-6 technical questions",
              body: "Probes real, role-level work. About 12 to 15 minutes. Scored mainly on evidence they have actually done it.",
            },
          ] as const).map((opt) => {
            const active = (draft.interview_depth ?? "screening") === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => setDraft((d) => ({ ...d, interview_depth: opt.value }))}
                className={`rounded-xl border p-3.5 text-left transition-colors ${
                  active
                    ? "border-[#0F0F0F] bg-[#0F0F0F] text-white"
                    : "border-[#D4D4D4] bg-white hover:border-[#0F0F0F]/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{opt.label}</span>
                  <span className={`h-3.5 w-3.5 rounded-full border-2 ${
                    active ? "border-white bg-white" : "border-[#D4D4D4]"
                  }`} />
                </div>
                <p className={`mt-0.5 text-xs font-medium ${active ? "text-white/80" : "text-[#404040]"}`}>
                  {opt.lead}
                </p>
                <p className={`mt-1.5 text-xs leading-relaxed ${active ? "text-white/70" : "text-[#737373]"}`}>
                  {opt.body}
                </p>
              </button>
            );
          })}
        </div>
      </Step>

      {/* ── 2. Who is calling ────────────────────────────────────────────────
          Enable + company grouped: both answer "does this round run, and who
          does the agent say it is calling for". Company is required — without
          it the greeting reads as a spam call and the backend refuses to dial. */}
      <Step n={2} title="Who is calling" hint="How the assistant introduces itself on the phone.">
        <label className={labelCls}>
          Hiring company <span className="text-red-600">*</span>
        </label>
        <input
          value={draft.hiring_company ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, hiring_company: e.target.value }))}
          placeholder="e.g. Acme Corp"
          aria-invalid={!stepsDone.company}
          className={inputCls}
        />
        <p className="mt-1.5 rounded-lg bg-[#F5F3EE] px-3 py-2 text-xs leading-relaxed text-[#404040]">
          <span className="text-[#737373]">The candidate hears:</span>{" "}
          &ldquo;Hi, this is Maya, an AI assistant calling from{" "}
          <span className="font-medium text-[#0F0F0F]">
            {(draft.hiring_company || "…").trim() || "…"}
          </span>
          &rsquo;s hiring team.&rdquo;
        </p>

        {/* Enable toggle hidden on uat (PR #22, fix/voice-ui): saving the round
            is what enables it, so the extra switch read as a second, redundant
            confirmation. `draft.enabled` is still saved from DEFAULT_CONFIG.
            Restore this block to give recruiters an explicit off switch. */}
        {/* <label className="mt-4 flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
            className="h-4 w-4 accent-[#0F0F0F]"
          />
          <span className="text-sm font-medium text-[#0F0F0F]">
            Enable voice round for this screening
          </span>
        </label> */}
      </Step>

      {/* ── 3. Questions ─────────────────────────────────────────────────── */}
      <Step
        n={3}
        title="Questions"
        hint="The assistant asks exactly these, word for word, and probes once when an answer is thin. Click any question to reword it."
        aside={
          <span className="text-xs text-[#737373]">
            {coveredCount}/{competencies.length} competencies
          </span>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {/* Generation is offered only until the round is finalised. Once a
              plan has been saved, regenerating would silently discard wording
              the recruiter curated (and that candidates may already have been
              asked), so from then on the list is edited, not rebuilt. */}
          {!(isEditing && draft.question_plan.length > 0) && (
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
          <button
            onClick={addQuestion}
            className="h-9 px-4 border border-[#D4D4D4] text-xs font-medium text-[#404040] rounded-xl hover:bg-white transition-colors"
          >
            + Add question
          </button>
          {!isEditing && draft.question_plan.length > 0 && (
            <span className="text-xs text-[#737373]">
              Regenerating replaces the list below.
            </span>
          )}
          {isEditing && draft.question_plan.length > 0 && (
            <span className="text-xs text-[#737373]">
              Edit the wording below. This plan is live, so it is no longer
              regenerated from scratch.
            </span>
          )}
        </div>

        <div className="space-y-2.5">
          {draft.question_plan.map((q, idx) => (
            <div
              key={idx}
              className="group rounded-xl border border-[#E8E5DF] bg-white transition-colors focus-within:border-[#C85A17]/50"
            >
              <div className="flex items-start gap-3 px-3.5 pt-3">
                <span className="mt-0.5 shrink-0 text-xs font-bold tabular-nums text-[#C85A17]">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                {/* Styled as an input rather than bare text: a borderless
                    textarea on a card reads as a label, and recruiters did not
                    realise the wording was theirs to change. The border stays
                    faint until hover/focus so a list of ten questions does not
                    become a wall of boxes. */}
                <textarea
                  value={q.text}
                  onChange={(e) => updateQuestion(idx, { text: e.target.value })}
                  rows={2}
                  placeholder="Question the agent will ask, word for word"
                  aria-label={`Question ${idx + 1} text`}
                  className="min-h-0 flex-1 resize-none rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm leading-relaxed text-[#0F0F0F] transition-colors placeholder:text-[#A3A3A3] hover:border-[#E8E5DF] hover:bg-[#FAFAF8] focus:border-[#0F0F0F] focus:bg-white focus:outline-none [field-sizing:content]"
                />
                <span
                  aria-hidden="true"
                  title="Editable"
                  className="mt-1 shrink-0 text-[#D4D4D4] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-0"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.5 2.5l2 2L5 11l-2.5.5L3 9l6.5-6.5z" />
                  </svg>
                </span>
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
              </div>
              <div className="mt-2 flex flex-col gap-2 border-t border-[#F0EEE8] px-3.5 py-2 sm:flex-row sm:items-center">
                <select
                  value={q.competency_ref}
                  onChange={(e) => updateQuestion(idx, { competency_ref: e.target.value })}
                  title="Competency this question assesses"
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
                        expected_signals: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="comma-separated, guides the follow-up"
                    title="Private notes on what a strong answer mentions — the agent probes once when these are missing, and never reads them aloud"
                    className="h-7 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-xs text-[#404040] transition-colors placeholder:text-[#C9C5BD] hover:border-[#E8E5DF] hover:bg-[#FAFAF8] focus:border-[#0F0F0F] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
          {draft.question_plan.length === 0 && (
            <p className="rounded-xl border border-dashed border-[#E8E5DF] py-6 text-center text-sm text-[#737373]">
              No questions yet. Generate a plan from the job description, or add one manually.
            </p>
          )}
        </div>
      </Step>

      {/* ── 4. Qualification checks ─────────────────────────────────────────
          Each toggle reveals only its own fields, so an unused check costs no
          screen space. */}
      <Step
        n={4}
        title="Qualification checks"
        hint="Logistics the call captures. Budget and band are never spoken to the candidate."
      >
        <div className="space-y-3">
          {([
            ["ask_compensation", "Compensation", "current and expected, asked last"],
            ["ask_notice", "Notice period", "captured, never evaluated aloud"],
            ["ask_location", "Location and work model", "drives the relocation check"],
          ] as const).map(([key, label, hint]) => {
            const on = draft.qualification?.[key] ?? true;
            return (
              <div key={key} className="rounded-xl border border-[#E8E5DF] bg-white">
                <label className="flex cursor-pointer select-none items-center gap-3 px-3.5 py-3">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => setQual({ [key]: e.target.checked })}
                    className="h-4 w-4 accent-[#0F0F0F]"
                  />
                  <span className="text-sm text-[#0F0F0F]">
                    {label}
                    <span className="ml-2 text-xs text-[#737373]">{hint}</span>
                  </span>
                </label>

                {on && key === "ask_compensation" && (
                  <div className="grid grid-cols-1 gap-4 border-t border-[#F0EEE8] px-3.5 py-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>
                        Budget cap, annual{" "}
                        <span className="text-[#737373]">(never shown to candidate)</span>
                      </label>
                      <input
                        type="number" min={0}
                        value={draft.qualification?.budget_cap ?? ""}
                        onChange={(e) => setQual({ budget_cap: e.target.value ? Number(e.target.value) : null })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Negotiation band %</label>
                      <input
                        type="number" min={0} max={100}
                        value={draft.qualification?.budget_band_pct ?? 10}
                        onChange={(e) => setQual({ budget_band_pct: Number(e.target.value) })}
                        className={inputCls}
                      />
                    </div>
                  </div>
                )}

                {on && key === "ask_location" && (
                  <div className="grid grid-cols-1 gap-4 border-t border-[#F0EEE8] px-3.5 py-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Work model</label>
                      <select
                        value={draft.qualification?.work_model ?? ""}
                        onChange={(e) => setQual({ work_model: (e.target.value || null) as "remote" | "onsite" | "hybrid" | null })}
                        className={inputCls}
                      >
                        <option value="">Not set</option>
                        <option value="remote">Remote</option>
                        <option value="onsite">Onsite</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>
                    {(draft.qualification?.work_model === "onsite" || draft.qualification?.work_model === "hybrid") && (
                      <>
                        <div>
                          <label className={labelCls}>
                            Job city <span className="text-red-600">*</span>
                          </label>
                          <input
                            value={draft.qualification?.job_city ?? ""}
                            onChange={(e) => setQual({ job_city: e.target.value || null })}
                            placeholder="e.g. Bangalore"
                            aria-invalid={needsJobCity}
                            className={
                              needsJobCity
                                ? inputCls.replace("border-[#D4D4D4]", "border-red-400") + " bg-red-50/40"
                                : inputCls
                            }
                          />
                          {needsJobCity && (
                            <p className="mt-1 text-xs text-red-600">
                              {draft.qualification?.relocation_required
                                ? "Required: the relocation check needs a city the agent can name."
                                : "Required for an " + (draft.qualification?.work_model ?? "onsite") + " role: the agent asks whether being based here works."}
                            </p>
                          )}
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer select-none sm:col-span-2">
                          <input
                            type="checkbox"
                            checked={draft.qualification?.relocation_required ?? false}
                            onChange={(e) => setQual({ relocation_required: e.target.checked })}
                            className="h-4 w-4 accent-[#0F0F0F]"
                          />
                          <span className="text-sm text-[#0F0F0F]">Relocation required
                            <span className="text-xs text-[#737373] ml-2">if the candidate is far and will not relocate, the call ends</span></span>
                        </label>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          <label className={labelCls}>Facts the assistant may share</label>
          <p className="mb-2 text-xs text-[#737373]">
            Answers to candidate questions. Anything not listed here gets an honest
            &ldquo;the recruiter will follow up&rdquo;.
          </p>
          <div className="space-y-2">
            {(draft.qualification?.role_facts ?? []).map((fact, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={fact}
                  onChange={(e) => setQual({ role_facts: (draft.qualification?.role_facts ?? []).map((f, j) => (j === i ? e.target.value : f)) })}
                  className={inputCls}
                  placeholder="e.g. Hybrid, 3 days in office"
                />
                <button
                  type="button"
                  onClick={() => setQual({ role_facts: (draft.qualification?.role_facts ?? []).filter((_, j) => j !== i) })}
                  className="text-xs text-[#737373] px-2 hover:text-red-600"
                >Remove</button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setQual({ role_facts: [...(draft.qualification?.role_facts ?? []), ""] })}
              className="text-xs text-[#0F0F0F] font-medium"
            >+ Add fact</button>
          </div>
        </div>
      </Step>

      {/* ── 5. Call settings — collapsed: sensible defaults, rarely changed ── */}
      <details className="mb-6 rounded-2xl border border-[#E8E5DF] bg-[#FAFAF8]">
        <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-semibold text-[#0F0F0F] marker:content-none">
          <span className="flex items-center justify-between">
            Call settings
            <span className="text-xs font-normal text-[#737373]">
              {draft.default_country_code} · {draft.calling_window.start}–{draft.calling_window.end}
            </span>
          </span>
        </summary>
        <div className="grid grid-cols-1 gap-4 border-t border-[#E8E5DF] px-4 py-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="default-country-code">Default country code</label>
            <CountryCodeSelect
              id="default-country-code"
              value={draft.default_country_code}
              onChange={(next) => setDraft((d) => ({ ...d, default_country_code: next }))}
            />
            <p className="mt-1 text-xs text-[#737373]">
              Used when a candidate&rsquo;s number has no country code. Search by name
              or by code.
            </p>
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
        </div>
      </details>

      {/* ── Sticky actions: blockers sit WITH the button that they block, so a
             disabled save always explains itself without scrolling. */}
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
              {stepsDone.company && stepsDone.questions
                ? `${draft.question_plan.length} question${draft.question_plan.length === 1 ? "" : "s"} · ${
                    (draft.interview_depth ?? "screening") === "deep_dive" ? "Deep dive" : "Screening"
                  }`
                : "Add a hiring company and at least one question to start calling."}
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
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || saveBlockers.length > 0}
                title={saveBlockers.length > 0 ? saveBlockers.join(" ") : undefined}
                className="h-9 px-5 border border-[#0F0F0F] bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#262626] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saveMutation.isPending ? "Saving…" : isEditing ? "Save changes" : "Save voice round"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One numbered configuration step.
 *
 * The screen used to be six flat sections of equal visual weight, so the most
 * consequential choice (interview type) looked exactly as important as the
 * default country code. Numbering plus card grouping gives the page a reading
 * order, and each step states what it changes about the call.
 */
function Step({
  n,
  title,
  hint,
  aside,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
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
