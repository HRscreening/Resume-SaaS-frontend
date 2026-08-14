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
import type { Rubric, VoiceConfig, QuestionPlanItem, QualificationConfig } from "@/types";
import { truncate } from "@/lib/utils";

type CountryCode = {
  code: string;
  country: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: "+91", country: "India" },
  { code: "+1", country: "United States" },
  { code: "+44", country: "United Kingdom" },
  { code: "+61", country: "Australia" },
  { code: "+81", country: "Japan" },
  { code: "+49", country: "Germany" },
  { code: "+33", country: "France" },
  { code: "+971", country: "UAE" },
  { code: "+65", country: "Singapore" },
  { code: "+86", country: "China" },
  { code: "+7", country: "Russia" },
  { code: "+27", country: "South Africa" },
];


const DEFAULT_CONFIG: VoiceConfig = {
  enabled: true,
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
      navigate({ to: "/screenings/$id", params: { id }, search: { tab: "Screening" } });
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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 text-xs">
        <Link to="/screenings" className="text-[#737373] hover:text-[#0F0F0F]">Screenings</Link>
        <span className="text-[#D4D4D4]">/</span>
        <Link to="/screenings/$id" params={{ id }} search={{ tab: "Screening" }} className="text-[#737373] hover:text-[#0F0F0F]">
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
              : "Configure the AI phone screen for shortlisted candidates. Questions are scored on the same rubric as resumes."}
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
      {/* <label className="flex items-center gap-3 mb-6 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={draft.enabled}
          onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
          className="h-4 w-4 accent-[#0F0F0F]"
        />
        <span className="text-sm font-medium text-[#0F0F0F]">Enable voice round for this screening</span>
      </label> */}

      {/* Hiring company — the agent introduces itself with this. Required: without
          it the greeting is generic ("the hiring team") and reads as a spam call,
          so the backend refuses to dial. */}
      <section className="mb-8">
        <label className={labelCls}>
          Hiring company <span className="text-red-600">*</span>
        </label>
        <input
          value={draft.hiring_company ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, hiring_company: e.target.value }))}
          placeholder="e.g. Acme Corp"
          className={inputCls}
        />
        <p className="text-xs text-[#737373] mt-1">
          The agent says &ldquo;calling from {(draft.hiring_company || "…").trim() || "…"}&rsquo;s hiring team&rdquo;.
          Calls cannot start until this is set.
        </p>
      </section>

      {/* Question plan */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-semibold text-[#0F0F0F]">Question plan</h2>
            <p className="text-xs text-[#737373]">
              {coveredCount}/{competencies.length} competencies covered
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Screening vs deep-dive: drives question count + technical depth
                at generation time, and call duration/watchdog on the call. */}
            <div className="flex rounded-xl border border-[#D4D4D4] overflow-hidden">
              {([
                { value: "screening", label: "Screening", hint: "3-4 quick fit questions" },
                { value: "deep_dive", label: "Deep dive", hint: "5-6 technical, role-level" },
              ] as const).map((opt) => {
                const active = (draft.interview_depth ?? "screening") === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.hint}
                    onClick={() => setDraft((d) => ({ ...d, interview_depth: opt.value }))}
                    className={`h-9 px-3 text-xs font-medium transition-colors ${
                      active
                        ? "bg-[#0F0F0F] text-white"
                        : "bg-white text-[#404040] hover:bg-[#F5F3EE]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="h-9 px-4 border border-[#0F0F0F] bg-[#0F0F0F] text-white text-xs font-medium rounded-xl hover:bg-[#262626] transition-colors disabled:opacity-60"
            >
              {generateMutation.isPending ? "Generating…" : "Generate from JD + rubric"}
            </button>
          </div>
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
                <textarea
                  value={q.text}
                  onChange={(e) => updateQuestion(idx, { text: e.target.value })}
                  rows={2}
                  placeholder="Question the agent will ask, word for word"
                  className="min-h-0 flex-1 resize-none bg-transparent text-sm leading-relaxed text-[#0F0F0F] placeholder:text-[#A3A3A3] focus:outline-none [field-sizing:content]"
                />
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
                    className="h-7 min-w-0 flex-1 bg-transparent text-xs text-[#404040] placeholder:text-[#C9C5BD] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
          {draft.question_plan.length === 0 && (
            <p className="rounded-xl border border-dashed border-[#E8E5DF] py-4 text-center text-sm text-[#737373]">
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

      {/* Qualification (discovery pre-screen) */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-[#0F0F0F] mb-1">Qualification checks</h2>
        <p className="text-xs text-[#737373] mb-3">
          What the screening call qualifies. Budget and band are never spoken to the candidate.
        </p>

        <div className="space-y-2 mb-4">
          {([
            ["ask_compensation", "Ask compensation", "current and expected CTC, asked last"],
            ["ask_notice", "Ask notice period", "captured, never evaluated aloud"],
            ["ask_location", "Ask location and work model", "drives the relocation check"],
          ] as const).map(([key, label, hint]) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={draft.qualification?.[key] ?? true}
                onChange={(e) => setQual({ [key]: e.target.checked })}
                className="h-4 w-4 accent-[#0F0F0F]"
              />
              <span className="text-sm text-[#0F0F0F]">{label}
                <span className="text-xs text-[#737373] ml-2">{hint}</span></span>
            </label>
          ))}
        </div>

        {(draft.qualification?.ask_compensation ?? true) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelCls}>Budget cap, annual <span className="text-[#737373]">(never shown to candidate)</span></label>
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

        {(draft.qualification?.ask_location ?? true) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="mt-4">
          <label className={labelCls}>Role facts the assistant may share</label>
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
                  className="text-xs text-[#737373] px-2"
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
      </section>

      {/* Call settings — voice/tier, timezone, and retry policy use sensible
          defaults (see DEFAULT_CONFIG) and are not surfaced to the recruiter. */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="max-w-50">
          <label className={labelCls}>Default country code</label>
          <select
            value={draft.default_country_code}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                default_country_code: e.target.value,
              }))
            }
            className={inputCls}
          >
            {COUNTRY_CODES.map(({ code,country }) => (
              <option key={code} value={code}>
                {code} - {country}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden sm:block" aria-hidden="true" />
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
      </section>

      {/* Actions */}
      <div className="border-t border-[#E8E5DF] pt-4">
        {saveBlockers.length > 0 && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            {saveBlockers.map((msg, i) => (
              <p key={i} className="text-xs leading-relaxed text-amber-800">{msg}</p>
            ))}
          </div>
        )}
        <div className="flex items-center justify-end gap-3">
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
  );
}
