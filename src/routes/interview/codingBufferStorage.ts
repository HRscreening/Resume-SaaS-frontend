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
  // Wall-clock deadline for whichever question `deadlineQuestionId` names,
  // or null while no question is current. Stored as an epoch ms number
  // specifically so a backgrounded or reloaded tab recomputes "how much
  // time is left" from Date.now() rather than resuming a countdown that
  // was paused while the tab was inactive.
  deadlineAt: number | null;
  // Which question id `deadlineAt` was computed for — NOT which question is
  // current; the server's pointer (via `hiresort.question`, see
  // useQuestionSync) is the only thing that decides that, and it is never
  // read from storage. This field exists purely so a remount can tell "the
  // pointer just re-named the question I already had a countdown for,
  // leave it alone" apart from "this is a different question, give it a
  // fresh countdown" the instant the pointer republishes — without this, a
  // reload would always look like a fresh deadline-owner and reset the
  // candidate's remaining time to a full allocation on every reconnect.
  deadlineQuestionId: string | null;
  buffers: Record<string, QuestionBuffer>;
  // Question ids the candidate has already submitted (by Submit or by
  // timeout auto-submit) and whose coding pane must therefore stay closed,
  // even if the server's pointer later names that id again (a republish of
  // the same tick, or the interviewer genuinely moving the candidate back
  // to it). Persisted here, not just in memory, so a remount (reload,
  // reconnect) does not resurrect a pane the candidate already finished
  // with. Never used to discard a buffer — `buffers` above keeps every
  // question's code regardless of this set.
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
    // `index` is read here only to tolerate it, never to use it: a state
    // saved by a build before this change (the local-fallback index that
    // question-state-machine.md's pointer design replaces) will still have
    // one. Ignoring it rather than rejecting the whole stored state is what
    // keeps that candidate's buffers and dismissed-set intact across this
    // exact deploy; `deadlineQuestionId` will simply be absent for them, so
    // their first post-deploy sync tick gives the restored question a fresh
    // countdown instead of resuming the old one — a one-time, harmless
    // reset right at the boundary, not a lost buffer.
    const parsed = JSON.parse(raw) as Partial<CodingState> & { index?: number };
    if (
      (parsed.deadlineAt !== null &&
        parsed.deadlineAt !== undefined &&
        typeof parsed.deadlineAt !== "number") ||
      typeof parsed.buffers !== "object" ||
      parsed.buffers === null
    ) {
      return null;
    }
    // `dismissed` is new-ish: a state saved by a build before this change
    // will not have it. Defaulting to {} (nothing dismissed yet) rather
    // than rejecting the whole stored state is what keeps an in-progress
    // interview's buffers intact across a deploy.
    const dismissed =
      typeof parsed.dismissed === "object" && parsed.dismissed !== null ? parsed.dismissed : {};
    const deadlineQuestionId =
      typeof parsed.deadlineQuestionId === "string" ? parsed.deadlineQuestionId : null;
    return {
      deadlineAt: parsed.deadlineAt ?? null,
      deadlineQuestionId,
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
