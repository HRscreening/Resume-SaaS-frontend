import type { HiddenChecksCounts, InterviewLatencySummary, InterviewScorecard } from "@/types";

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}

/**
 * "Replies in 1.2 s (p50) · 2.8 s (p95) · first word 1.4 s after joining",
 * or null when the session recorded none of it. Only the numbers a recruiter
 * can act on: the wait after the candidate stops talking, and the wait for
 * the first word. Component timings stay in the API for engineers.
 */
export function responseTimeLabel(latency: InterviewLatencySummary | null | undefined): string | null {
  if (!latency) return null;
  const parts: string[] = [];
  const e2e = latency.e2e;
  if (e2e && Number.isFinite(e2e.p50_ms) && (e2e.n ?? 0) > 0) {
    const p50 = seconds(e2e.p50_ms as number);
    parts.push(
      Number.isFinite(e2e.p95_ms) ? `Replies in ${p50} (p50) · ${seconds(e2e.p95_ms as number)} (p95)` : `Replies in ${p50}`,
    );
  }
  const first = latency.startup?.join_to_first_word_s;
  if (Number.isFinite(first)) {
    parts.push(`first word ${(first as number).toFixed(1)} s after joining`);
  }
  return parts.length ? parts.join(" · ") : null;
}

// Known code languages the candidate-facing editor offers (lib/interviewApi.ts's
// InterviewLanguage). Kept as a display-only lookup, not a shared type import:
// a scorecard is read-only history and must still render a language the editor
// has since dropped or never offered.
const LANGUAGE_LABEL: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
};

export function languageLabel(language: string): string {
  return LANGUAGE_LABEL[language] ?? language;
}

const HIDDEN_CATEGORY_ORDER = ["basic", "edge", "adversarial"];

// "6 of 8 passed (basic 3/3, edge 2/3, adversarial 1/2)": the same sentence
// the judge model was given, so the recruiter reads what the score rests on.
export function hiddenChecksLabel(checks: HiddenChecksCounts): string {
  if (checks.compile_error) return "the code did not compile.";
  const categories = [
    ...HIDDEN_CATEGORY_ORDER.filter((c) => c in checks.by_category),
    ...Object.keys(checks.by_category).filter((c) => !HIDDEN_CATEGORY_ORDER.includes(c)),
  ];
  const breakdown = categories
    .map((c) => `${c} ${checks.by_category[c].passed}/${checks.by_category[c].total}`)
    .join(", ");
  return `${checks.passed} of ${checks.total} passed${breakdown ? ` (${breakdown})` : ""}`;
}

export function formatCompletedAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Every question id the scorecard has anything to say about: scored
 * (`per_question`) or coded (`code`). Unioned rather than read off one field
 * alone, because an id that only has submitted code and no scorer entry (or
 * vice versa) must still get a card — dropping it would quietly hide the
 * candidate's own submission.
 */
export function questionIds(sc: InterviewScorecard): string[] {
  const ids = new Set<string>([
    ...Object.keys(sc.per_question ?? {}),
    ...Object.keys(sc.code ?? {}),
  ]);
  return [...ids].sort();
}

// Fields already rendered explicitly by InterviewQuestionDetail. Anything
// else on a per_question entry still renders, via `otherFields` below,
// rather than being silently dropped because this scorecard's shape has not
// been pinned down yet.
const KNOWN_PER_QUESTION_FIELDS = new Set(["score", "summary", "explanation", "evidence"]);

export interface OtherField {
  label: string;
  value: string;
}

function humanizeKey(key: string): string {
  const clean = key.replace(/[_-]+/g, " ").trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Whatever a per_question entry carries beyond the fields this UI already
 * knows how to show. Only primitives render (a string/number/boolean turns
 * into one line); nested objects or arrays under an unknown key are skipped
 * rather than guessed at — this is a contract built in parallel with the
 * backend, and an unrecognised shape should degrade quietly, not throw or
 * dump a `[object Object]`.
 */
export function otherFields(entry: Record<string, unknown>): OtherField[] {
  const out: OtherField[] = [];
  for (const [key, value] of Object.entries(entry)) {
    if (KNOWN_PER_QUESTION_FIELDS.has(key)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out.push({ label: humanizeKey(key), value: String(value) });
    }
  }
  return out;
}
