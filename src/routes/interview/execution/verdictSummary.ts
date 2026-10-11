import type { SubmitVerdict } from "@/lib/interviewApi";

// What the candidate reads after Submit, when the question has hidden
// checks: inputs they never see, each with the output a verified reference
// solution produced. The server sends counts only (see the backend's
// judge.py::candidate_verdict), so there is nothing here that could say
// WHICH input failed, only how many and of what kind. That is the same
// thing a human interviewer says: "this breaks on an edge case".
export interface VerdictSummary {
  tone: "pass" | "partial" | "pending" | "error";
  headline: string;
  detail: string | null;
}

// Fixed order, so the sentence reads the same way every time regardless of
// the key order the server happened to serialise.
const CATEGORY_ORDER = ["basic", "edge", "adversarial"];

function categoryLabel(category: string, count: number): string {
  return `${count} ${category} ${count === 1 ? "case" : "cases"}`;
}

export function isFullPass(verdict: SubmitVerdict | null | undefined): boolean {
  return Boolean(
    verdict && !verdict.compile_error && verdict.total > 0 && verdict.passed === verdict.total,
  );
}

export function verdictSummary(verdict: SubmitVerdict | null | undefined): VerdictSummary {
  // No verdict is not a bad verdict: the code is saved, and it will be
  // checked by the scoring worker after the interview. Happens when the
  // sandbox is down, on a question with no hidden checks, and once the
  // per-question limit on judged submissions is reached.
  if (!verdict) {
    return {
      tone: "pending",
      headline: "Saved. Your solution will be checked after the interview.",
      detail: null,
    };
  }

  if (verdict.compile_error) {
    return {
      tone: "error",
      headline: "Your code did not compile.",
      detail: verdict.compile_error,
    };
  }

  if (isFullPass(verdict)) {
    return {
      tone: "pass",
      headline: `All ${verdict.total} hidden checks passed.`,
      detail: null,
    };
  }

  const categories = [
    ...CATEGORY_ORDER.filter((c) => c in verdict.by_category),
    ...Object.keys(verdict.by_category).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];
  const failing = categories
    .map((category) => {
      const counts = verdict.by_category[category];
      return { category, failed: counts.total - counts.passed };
    })
    .filter(({ failed }) => failed > 0)
    .map(({ category, failed }) => categoryLabel(category, failed));

  return {
    tone: "partial",
    headline: `${verdict.passed} of ${verdict.total} hidden checks passed.`,
    detail: failing.length > 0 ? `Still failing: ${failing.join(", ")}.` : null,
  };
}
