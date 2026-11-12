import type { InterviewLanguage, InterviewQuestion } from "@/lib/interviewApi";

// What the editor opens with: the function stub the server generated from
// the question's signature (backend harness.py), typed for the language.
// Never written here, so it always matches the driver that will call it.
// A question published before the harness has none and opens empty.

type StarterSource = Pick<InterviewQuestion, "kind"> & { starter_code?: Record<string, string> };

export function starterCodeFor(question: StarterSource, language: InterviewLanguage): string {
  if (question.kind !== "coding") return "";
  return question.starter_code?.[language] ?? "";
}

/**
 * Whether the editor still holds untouched starter code.
 *
 * This is the whole reason switching language can be safe. The existing
 * rule is that changing language never discards the candidate's work --
 * their source is theirs, not a template. But a stub they have not typed
 * into is not their work, and leaving Python's stub in the box after they
 * pick JavaScript is worse than useless. Compared on trimmed text so a
 * stray newline does not count as having started.
 */
export function isUntouchedStarter(source: string, question: StarterSource): boolean {
  const current = source.trim();
  if (!current) return true;
  return Object.values(question.starter_code ?? {}).some((stub) => stub.trim() === current);
}
