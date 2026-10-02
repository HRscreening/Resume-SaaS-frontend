import type { InterviewLanguage } from "@/lib/interviewApi";

// What survives a remount: which question the candidate is on, when that
// question's time is up, and every question's buffer so far. sessionStorage
// (not localStorage) because this belongs to one interview attempt in one
// tab, not something that should reappear in a future, unrelated interview
// on the same browser.
//
// Keyed by the invite token, because the same browser could in principle
// hold a stale entry from a previous link (shared machine, bookmarked URL).

export interface QuestionBuffer {
  language: InterviewLanguage;
  source: string;
}

export interface CodingState {
  index: number;
  // Wall-clock deadline for the current question, or null once the
  // candidate has moved past every question. Stored as an epoch ms number
  // specifically so a backgrounded or reloaded tab recomputes "how much
  // time is left" from Date.now() rather than resuming a countdown that
  // was paused while the tab was inactive.
  deadlineAt: number | null;
  buffers: Record<string, QuestionBuffer>;
  // Question ids the candidate has already submitted (by Submit or by
  // timeout auto-submit) and whose coding pane must therefore stay closed,
  // even if the agent's `hiresort.question` signal later names that id
  // again (a republish of the same tick, or the agent genuinely moving the
  // candidate back to it). Persisted here, not just in memory, so a
  // remount (reload, reconnect) does not resurrect a pane the candidate
  // already finished with. Never used to discard a buffer — `buffers`
  // above keeps every question's code regardless of this set.
  dismissed: Record<string, true>;
}

function storageKey(token: string): string {
  return `hiresort.interview.coding.${token}`;
}

// sessionStorage can throw (privacy mode, storage disabled) and a thrown
// read/write here must never take the interview down — the candidate just
// loses the "survives a reload" safety net for that session, not the
// interview itself.
export function loadCodingState(token: string): CodingState | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(token));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CodingState>;
    if (
      typeof parsed.index !== "number" ||
      (parsed.deadlineAt !== null && typeof parsed.deadlineAt !== "number") ||
      typeof parsed.buffers !== "object" ||
      parsed.buffers === null
    ) {
      return null;
    }
    // `dismissed` is new: a state saved by a build before this change will
    // not have it. Defaulting to {} (nothing dismissed yet) rather than
    // rejecting the whole stored state is what keeps an in-progress
    // interview's buffers and index intact across a deploy.
    const dismissed =
      typeof parsed.dismissed === "object" && parsed.dismissed !== null ? parsed.dismissed : {};
    return {
      index: parsed.index,
      deadlineAt: parsed.deadlineAt ?? null,
      buffers: parsed.buffers,
      dismissed,
    };
  } catch {
    return null;
  }
}

export function saveCodingState(token: string, state: CodingState): void {
  try {
    window.sessionStorage.setItem(storageKey(token), JSON.stringify(state));
  } catch {
    // Nothing to recover: the candidate's in-memory React state is still
    // correct for the rest of this tab session, it just will not survive a
    // reload. Run/Submit still work either way.
  }
}
