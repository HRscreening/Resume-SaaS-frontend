import type { InterviewScorecard } from "@/types";

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
