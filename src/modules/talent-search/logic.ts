import type { Answer, ClarifyingQuestion } from "./types";

export type AvatarState = { kind: "img" | "initials" | "blank"; initials: string };

export function initialsOf(name: string | null | undefined): string {
  if (!name) return "";
  const letters = name
    .split(/\s+/)
    .map((part) => part.replace(/[^\p{L}]/gu, ""))
    .filter(Boolean)
    .map((part) => part[0].toUpperCase());
  if (letters.length === 0) return "";
  return letters.length === 1 ? letters[0] : letters[0] + letters[letters.length - 1];
}

export function avatarState(name: string | null | undefined, photoUrl: string | null | undefined, failed: boolean): AvatarState {
  const initials = initialsOf(name);
  if (photoUrl && !failed) return { kind: "img", initials };
  return initials ? { kind: "initials", initials } : { kind: "blank", initials: "" };
}

export type Selection = { optionId?: string; other?: string };

export function buildAnswers(questions: ClarifyingQuestion[], selections: Partial<Record<string, Selection>>): Answer[] {
  const answers: Answer[] = [];
  for (const q of questions) {
    const s = selections[q.field];
    if (!s) continue;
    if (s.optionId) answers.push({ field: q.field, option_id: s.optionId });
    else if (s.other && s.other.trim()) answers.push({ field: q.field, other_text: s.other.trim() });
  }
  return answers;
}

export function formatMonths(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years && rest) return `${years}y ${rest}m`;
  if (years) return `${years}y`;
  return `${rest}m`;
}

const SOURCE_LABELS: Record<string, string> = { crustdata: "Crustdata", apollo: "Apollo", internal: "Your resumes" };

export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

export function providerNotice(status: Record<string, string>): string {
  const down = Object.entries(status).filter(([, state]) => state !== "ok").map(([name]) => sourceLabel(name));
  if (down.length === 0) return "";
  return `${down.length} source${down.length > 1 ? "s" : ""} unavailable: ${down.join(", ")}`;
}

export const FIT_LABEL: Record<string, string> = { strong: "Strong fit", good: "Good fit", partial: "Partial fit", weak: "Weak fit" };

export const SWITCH_LABEL: Record<string, string> = {
  high: "Likely open to a move",
  medium: "Maybe open to a move",
  low: "Recently moved",
  unknown: "Not enough history",
};

// Poll for at most 3 minutes per run; the worker gives up after 6, and a search
// stuck longer can be restarted (the server treats it as stale after 10).
export const MAX_POLL_MS = 3 * 60 * 1000;

export function shouldPoll(status: string | undefined, now: number, pollUntil: number | undefined): boolean {
  return status === "searching" && (pollUntil === undefined || now < pollUntil);
}

export function finishedRun(previous: string | undefined, next: string | undefined): boolean {
  return previous === "searching" && (next === "done" || next === "failed");
}
