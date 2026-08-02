import type { CallScorecardDetail, Qualification } from "@/types";

export type Tone = "positive" | "caution" | "critical" | "neutral";

export interface Chip {
  label: string;
  tone: Tone;
}

/** Chip styling per tone. One table so every badge on the scorecard matches. */
export const TONE_CHIP: Record<Tone, string> = {
  positive: "bg-green-50 text-green-800 border-green-200",
  caution: "bg-amber-50 text-amber-800 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-white text-[#404040] border-[#E8E5DF]",
};

export const TONE_HEX: Record<Tone, string> = {
  positive: "#16A34A",
  caution: "#D97706",
  critical: "#DC2626",
  neutral: "#A3A3A3",
};

export function recommendationChip(rec: string | null): Chip {
  switch ((rec ?? "").toLowerCase()) {
    case "advance": return { label: "Advance", tone: "positive" };
    case "hold": return { label: "Hold", tone: "caution" };
    case "reject": return { label: "Reject", tone: "critical" };
    default: return { label: "Not scored", tone: "neutral" };
  }
}

export function verdictChip(verdict: string | undefined): Chip {
  switch (verdict) {
    case "qualified": return { label: "Qualified", tone: "positive" };
    case "needs_review": return { label: "Needs review", tone: "caution" };
    case "not_a_fit": return { label: "Not a fit", tone: "critical" };
    default: return { label: "No verdict", tone: "neutral" };
  }
}

/** Score bands mirror the ones the candidate list already colours by. */
export function scoreTone(score: number | null | undefined): Tone {
  if (score == null) return "neutral";
  if (score >= 75) return "positive";
  if (score >= 50) return "caution";
  return "critical";
}

export function criterionTone(scoreOutOfTen: number): Tone {
  if (scoreOutOfTen >= 7) return "positive";
  if (scoreOutOfTen >= 4) return "caution";
  return "critical";
}

// The scorer prefixes an entry with "Not asked:" when a planned topic never came
// up. That is a gap in the INTERVIEW, not a concern about the candidate, and
// mixing the two reads as if the candidate failed something they were never
// asked. Splitting them is what lets the recruiter see that a low score may
// simply be thin coverage.
const NOT_ASKED = /^\s*not asked\s*:\s*/i;

export interface MissingSplit {
  concerns: string[];
  notAsked: string[];
}

export function partitionMissingElements(items: readonly string[] | null): MissingSplit {
  const concerns: string[] = [];
  const notAsked: string[] = [];
  for (const item of items ?? []) {
    if (NOT_ASKED.test(item)) notAsked.push(item.replace(NOT_ASKED, ""));
    else concerns.push(item);
  }
  return { concerns, notAsked };
}

/** Merge the qualification flags and the scorer flags into one deduped list. */
export function mergeFlags(...lists: (readonly string[] | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const flag of list ?? []) {
      const key = flag.trim().toLowerCase().replace(/[.\s]+$/, "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(flag.trim());
    }
  }
  return out;
}

export function humanizeFlag(flag: string): string {
  const clean = flag.replace(/[_-]+/g, " ").trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export interface FactRow {
  label: string;
  value: string | null;
  /** Short note shown beside the value, e.g. "over band". */
  note?: string;
  noteTone?: Tone;
  /** True when this fact on its own can rule the candidate out. */
  blocking?: boolean;
}

/**
 * The logistics a recruiter screens on. Values the call never captured return
 * null so the UI can say "not captured" rather than an ambiguous dash — the
 * difference between "they refused to say" and "we forgot to ask" matters.
 */
export function buildFactRows(q: Qualification): FactRow[] {
  const f = q.facts;
  const bandNote =
    f.ctc_in_band === false ? { note: "over band", noteTone: "critical" as Tone, blocking: true }
    : f.ctc_in_band === true ? { note: "in band", noteTone: "positive" as Tone }
    : {};
  return [
    { label: "Current CTC", value: f.current_ctc },
    { label: "Expected CTC", value: f.expected_ctc, ...bandNote },
    { label: "Notice period", value: f.notice_period },
    { label: "Location", value: f.candidate_location },
    {
      label: "Relocation",
      value: f.relocation_willing == null ? null : f.relocation_willing ? "Willing" : "Not willing",
      ...(f.relocation_willing === false
        ? { note: "required", noteTone: "critical" as Tone, blocking: true }
        : {}),
    },
  ];
}

/** True when there is enough competency data to justify the headline score. */
export function hasAssessment(data: CallScorecardDetail): boolean {
  return Boolean(
    data.overall_summary ||
    (data.strengths?.length ?? 0) > 0 ||
    (data.missing_elements?.length ?? 0) > 0 ||
    data.score_drivers ||
    data.breakdown.length > 0,
  );
}
