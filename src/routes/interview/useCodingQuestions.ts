import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Room } from "livekit-client";

import {
  getInterviewQuestions,
  submitCode,
  type InterviewLanguage,
  type RunCodeResponse,
} from "@/lib/interviewApi";
import {
  loadCodingState,
  saveCodingState,
  type CodingState,
  type QuestionBuffer,
} from "./codingBufferStorage";
import { useCountdown } from "./useCountdown";
import { useQuestionSync } from "./useQuestionSync";
import { notifySubmitted } from "./notifySubmission";
import { runCodeLocally, CppNotRunnableError, PythonNotReadyError } from "./execution/runCodeLocally";
import { pyodideManager } from "./execution/pyodideManager";
import { usePyodideStatus } from "./execution/usePyodideStatus";

const DEFAULT_LANGUAGE: InterviewLanguage = "python";

function minutesToMs(minutes: number): number {
  return minutes * 60_000;
}

function bufferFor(buffers: Record<string, QuestionBuffer>, id: string): QuestionBuffer {
  return buffers[id] ?? { language: DEFAULT_LANGUAGE, source: "" };
}

export type RunNotice = { kind: "error" | "unavailable"; message: string };
export type SubmitNotice = { kind: "saved" | "error"; message: string };

// Everything the coding pane needs: which question (if any) is current, its
// saved-as-you-type buffer, the countdown, and the Run/Submit actions. Owns
// no audio state and no caption state of its own — those stay in
// InterviewRoom and are threaded into CodingPane separately.
//
// WHICH QUESTION IS CURRENT is decided by the agent, not by this hook: the
// gap found during the build (coding-pane-contract.md's ADDENDUM) is that a
// screen advancing on its own timer drifts from an interviewer pacing itself
// off the conversation, and a drifted screen means the candidate writes code
// for a question nobody asked. `useQuestionSync` follows the room's
// `hiresort.question` topic, the same signal `advance_segment` derives from
// coverage server-side, and that id — once this round's question list
// confirms it is one of ITS ids — is what `current` resolves to.
//
// The local index (`state.index`) still exists and still advances on its own
// timer, but only as the pre-sync fallback: until the first valid signal
// arrives, `current` falls back to it, which is exactly today's behaviour
// (an interview where the data channel never arrives must still be usable).
// Once a signal has been adopted, it is sticky (see useQuestionSync) and wins
// over the local index from then on.
//
// The per-question timer itself is unconditional either way: whichever
// question is CURRENTLY DISPLAYED gets its own fresh countdown against its
// own `allocated_minutes`, for the warning and the auto-submit on expiry
// only. It never decides what is displayed — see the `deadlineOwnerRef`
// effect below, and `handleExpire`, which only advances the local fallback
// index when no sync signal has taken over yet.
//
// WHICH QUESTION IS CURRENT and WHETHER THE PANE IS SHOWN are two different
// questions with two different answers, on purpose (see this change's
// report, pane-visibility-report.md). `current` keeps the fallback behaviour
// above — it must resolve to *something* before the first signal arrives, so
// the timer and the buffers have a question to attach to even in an
// interview whose data channel never comes up. `showPane` does not: it is
// true only once a real signal has named a coding question (`current` is
// synced, not just defaulted to index 0), and false again forever for any
// question id the candidate has already submitted (`dismissed`), no matter
// how `current` itself resolves. A pane that opened because the local clock
// guessed is worse than one that stays closed — closed just means the
// interview keeps going by voice, which is always a safe default.
export function useCodingQuestions(token: string, room: Room | null) {
  const { data, error: questionsError } = useQuery({
    queryKey: ["interview-questions", token],
    queryFn: () => getInterviewQuestions(token),
    // The round's question set is fixed once the interview starts; no
    // in-flight event should ever invalidate it.
    staleTime: Infinity,
  });
  const questions = data?.questions;

  // Preloaded the moment this hook mounts — which is as soon as
  // InterviewRoom's live call renders, regardless of call state or whether
  // the current question is even a coding one (see InterviewRoom's comment
  // on why this hook "runs regardless of call state"). Pyodide is several
  // megabytes; starting the fetch here, rather than waiting for the first
  // Run press, is what makes "ready by the time a coding question arrives"
  // true for a real interview instead of aspirational copy. preload() is
  // idempotent, so a remount (a reconnect, a rejoin) never restarts it.
  useEffect(() => {
    pyodideManager.preload();
  }, []);
  const pythonStatus = usePyodideStatus();

  const knownQuestionIds = useMemo(
    () => (questions ? new Set(questions.map((q) => q.id)) : null),
    [questions],
  );
  // The agent-named current question, once a valid, known id has arrived —
  // null (and therefore ignored below) until then or if it never does.
  const syncedQuestionId = useQuestionSync(room, knownQuestionIds);

  const [state, setState] = useState<CodingState | null>(null);
  const expiringRef = useRef(false);

  // Which question id the CURRENTLY STORED `deadlineAt` was computed for.
  // Lets the id-change effect below tell "the displayed question just
  // changed, give it a fresh countdown" apart from "nothing changed, leave
  // the restored/ticking deadline alone" — the two cases a plain `[current]`
  // effect dependency cannot distinguish between on its own. Set directly
  // (not via setState) by the mount effect below, synchronously with the
  // state it establishes, so the id-change effect never fires spuriously on
  // first mount or on a reload that is restoring an in-progress countdown.
  const deadlineOwnerRef = useRef<string | null>(null);

  // Restore a prior mount's progress (a reload, a remount after a
  // reconnect) or start at question 0 the moment the question list is
  // known. The `prev` guard makes this run at most once per mount: a
  // background refetch of `questions` (there should not be one, given
  // staleTime above) must never reset progress already made.
  useEffect(() => {
    if (!questions || questions.length === 0) return;
    setState((prev) => {
      if (prev) return prev;
      const stored = loadCodingState(token);
      if (stored && stored.index < questions.length) {
        deadlineOwnerRef.current = questions[stored.index]?.id ?? null;
        return stored;
      }
      const first = questions[0];
      deadlineOwnerRef.current = first.id;
      return {
        index: 0,
        deadlineAt: Date.now() + minutesToMs(first.allocated_minutes),
        buffers: stored?.buffers ?? {},
        dismissed: stored?.dismissed ?? {},
      };
    });
  }, [questions, token]);

  // Persisted on every change, slightly debounced so fast typing does not
  // turn into a synchronous sessionStorage write per keystroke while live
  // call audio is active.
  useEffect(() => {
    if (!state) return;
    const id = window.setTimeout(() => saveCodingState(token, state), 250);
    return () => window.clearTimeout(id);
  }, [state, token]);

  // The DISPLAYED question: the agent's synced id when this round's question
  // list recognises it, falling back to the local index otherwise (no signal
  // yet, or none ever arrives — today's behaviour, unchanged). Resolved by
  // id rather than trusting the signal's own `index`, so a stale or
  // off-by-one index from the agent can never point this at the wrong
  // question while a valid id is available.
  const syncedIndex = useMemo(
    () => (questions && syncedQuestionId ? questions.findIndex((q) => q.id === syncedQuestionId) : -1),
    [questions, syncedQuestionId],
  );
  const displayIndex = syncedIndex !== -1 ? syncedIndex : (state?.index ?? 0);
  const index = displayIndex;
  const total = questions?.length ?? 0;
  const current = questions && state ? questions[displayIndex] : undefined;
  const buffer = current ? bufferFor(state?.buffers ?? {}, current.id) : null;

  // Question ids the candidate has already submitted (Submit, or the
  // timeout auto-submit) — see CodingState.dismissed. Checked by id, not by
  // index, so it survives the pane being re-shown at a different index
  // later and still recognises "I've already finished this one."
  const dismissedIds = state?.dismissed;
  const isCurrentDismissed = Boolean(current && dismissedIds?.[current.id]);

  // Gates the PANE'S VISIBILITY — deliberately stricter than `current`.
  // `current` (above) resolves by sync-or-fallback because the timer and
  // the buffers must work even before any signal has arrived (today's
  // behaviour, unchanged). The pane itself is held to a higher bar: it may
  // only open on an actual signal from the agent naming a coding question,
  // never on the local fallback index alone. `syncedIndex !== -1` is that
  // signal — it is -1 whenever no valid `hiresort.question` tick has been
  // adopted yet, which is exactly the "interviewer hasn't gotten there"
  // window this change closes. See useQuestionSync for why a stale or
  // unknown id can never produce a value other than -1 here.
  //
  // A dismissed question is the other way to fail this gate: once
  // submitted (manually or by timeout), the pane for that question id
  // never reopens, even if the agent's signal republishes it or explicitly
  // moves back to it — see handleSubmit/handleExpire below for where
  // `dismissed` gets set, and this hook's module comment / the report for
  // why "moved back" gets the same treatment as "still naming it."
  const showPane = syncedIndex !== -1 && current?.kind === "coding" && !isCurrentDismissed;

  // The timer belongs to whichever question is actually on screen, not to
  // the local index: give the displayed question a fresh countdown against
  // its own `allocated_minutes` the moment it changes — whether that change
  // came from the local fallback advancing, or from a sync signal moving the
  // pane forward, backward, or to a question the local index was never on.
  // A restored deadline (mount effect above already set deadlineOwnerRef to
  // match) is left untouched, which is what preserves true remaining time
  // across a reload instead of resetting it to a fresh full allocation.
  useEffect(() => {
    const id = current?.id ?? null;
    if (deadlineOwnerRef.current === id) return;
    deadlineOwnerRef.current = id;
    setState((prev) => {
      if (!prev) return prev;
      if (!current) return { ...prev, deadlineAt: null };
      return { ...prev, deadlineAt: Date.now() + minutesToMs(current.allocated_minutes) };
    });
  }, [current]);

  const [runResult, setRunResult] = useState<RunCodeResponse | null>(null);
  const [runNotice, setRunNotice] = useState<RunNotice | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [submitNotice, setSubmitNotice] = useState<SubmitNotice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read inside the async handlers below so a Run or Submit request that is
  // still in flight when the candidate's question advances (the timer fired
  // mid-request, or — defensively — any other path) applies its result only
  // if it is still talking about the question currently on screen. Without
  // this, a slow Run response for question 1 could land on question 2's
  // results panel after the auto-advance.
  const currentIdRef = useRef<string | undefined>(current?.id);
  currentIdRef.current = current?.id;

  const setSource = useCallback(
    (source: string) => {
      setRunResult(null);
      setRunNotice(null);
      setSubmitNotice(null);
      setState((prev) => {
        if (!prev || !current) return prev;
        const existing = bufferFor(prev.buffers, current.id);
        return { ...prev, buffers: { ...prev.buffers, [current.id]: { ...existing, source } } };
      });
    },
    [current],
  );

  // Changing language never touches `source`: it is the candidate's work,
  // not a template to discard (contract, "Frontend behaviour").
  const setLanguage = useCallback(
    (language: InterviewLanguage) => {
      setRunResult(null);
      setRunNotice(null);
      setState((prev) => {
        if (!prev || !current) return prev;
        const existing = bufferFor(prev.buffers, current.id);
        return { ...prev, buffers: { ...prev.buffers, [current.id]: { ...existing, language } } };
      });
    },
    [current],
  );

  // Best-effort submit shared by the manual Submit button and the timeout
  // path. Never throws: a failure here must never be allowed to look like a
  // lost buffer, only like a save that has not reached the server yet.
  //
  // Tells the agent right after POST /submit succeeds (flow-completion-
  // contract.md, step 4) — never before, and never in a way that can affect
  // the return value below: notifySubmitted is fire-and-forget and swallows
  // its own failures, so a candidate's submission is never put at risk by a
  // data packet that did not go out.
  const persist = useCallback(
    async (questionId: string, language: InterviewLanguage, source: string): Promise<boolean> => {
      try {
        await submitCode(token, { question_id: questionId, language, source });
        notifySubmitted(room, questionId, language);
        return true;
      } catch {
        // One retry: most failures here are a single dropped request, and a
        // candidate who just ran out of time should not lose their answer
        // to one bad network blip.
        try {
          await submitCode(token, { question_id: questionId, language, source });
          notifySubmitted(room, questionId, language);
          return true;
        } catch {
          return false;
        }
      }
    },
    [token, room],
  );

  // Advances the LOCAL FALLBACK index only. This is a no-op on what is
  // displayed once a sync signal has been adopted (`current` resolves by
  // synced id first — see `displayIndex` above), which is deliberate: moving
  // the candidate on is the agent's call once it is driving the pane, not a
  // local clock's. The resulting deadline for whatever ends up displayed is
  // handled uniformly by the id-change effect above, not here.
  const advance = useCallback(() => {
    setState((prev) => (prev ? { ...prev, index: prev.index + 1 } : prev));
  }, []);

  // Marks a question id as submitted — see CodingState.dismissed and
  // `showPane` above. The merge is keyed by id and never touches `buffers`,
  // so a question's code is preserved exactly as-is regardless of how many
  // times this fires for it (a re-submit after being moved back, a second
  // timeout tick that lost the race with expiringRef — see handleExpire).
  const dismissQuestion = useCallback((questionId: string) => {
    setState((prev) =>
      prev ? { ...prev, dismissed: { ...prev.dismissed, [questionId]: true } } : prev,
    );
  }, []);

  const handleExpire = useCallback(() => {
    if (expiringRef.current || !current || !state) return;
    // Already submitted (manually, or by an earlier expiry) — the pane for
    // this id is closed for good (see `showPane`), so there is nothing left
    // to capture and nowhere for a notice to be seen. Without this guard a
    // countdown that is still ticking for a dismissed-but-synced question
    // (the agent named it again after the candidate moved on) would
    // re-submit the same buffer on every expiry.
    if (state.dismissed[current.id]) return;
    expiringRef.current = true;
    (async () => {
      if (current.kind === "coding") {
        const b = bufferFor(state.buffers, current.id);
        const ok = await persist(current.id, b.language, b.source);
        setSubmitNotice(
          ok
            ? { kind: "saved", message: "Time's up. Your answer was saved." }
            : {
                kind: "error",
                message:
                  "Time's up. We could not reach the server to save your answer, but it is still here in this browser.",
              },
        );
        // Dismiss only once the server actually has it. A failed persist
        // leaves the pane open (even past the deadline, Submit is still on
        // screen) so the candidate's one recovery path — press Submit again
        // — still exists; see handleSubmit for the identical rule.
        if (ok) dismissQuestion(current.id);
      }
      // Moving on is only this hook's call while nothing has told it
      // otherwise. Once a sync signal is driving the pane, expiry still
      // captures the buffer above (never discard what they wrote) but leaves
      // deciding what comes next to the agent's own next publish.
      if (syncedQuestionId === null) advance();
      expiringRef.current = false;
    })();
  }, [current, state, persist, advance, syncedQuestionId, dismissQuestion]);

  const { secondsRemaining, warning } = useCountdown(state?.deadlineAt ?? null, handleExpire);

  // Run results are shown next to the specific question/examples they came
  // from, so they are wrong the instant the candidate is looking at a
  // different question and must clear immediately on that transition.
  // submitNotice (a "Saved." / "Time's up, saved" toast) is deliberately
  // NOT cleared here: the timeout path sets it for the question that just
  // expired in the same breath as advancing past it, and a candidate should
  // still see "Time's up. Your answer was saved." for a moment after the
  // next question appears. It dismisses itself on its own timer below.
  useEffect(() => {
    setRunResult(null);
    setRunNotice(null);
  }, [current?.id]);

  // Self-dismissing toast: whatever set submitNotice (manual Submit, or the
  // timeout path) does not also own clearing it later.
  useEffect(() => {
    if (!submitNotice) return;
    const id = window.setTimeout(() => setSubmitNotice(null), 6000);
    return () => window.clearTimeout(id);
  }, [submitNotice]);

  // Structural reasons Run cannot be used right now, independent of whether
  // a run happens to be in flight: C++ has no browser runner at all, and
  // Python needs its (preloaded, but not instant) worker to be ready. Kept
  // separate from `isRunning` so the UI can show a persistent, honest banner
  // for these ("Python is still loading...") without also showing one for
  // the ordinary, self-explanatory "Running" spinner state. Every disabled
  // Run button traces back to one of these three reasons, or to isRunning.
  const runBlockedReason: string | null =
    buffer?.language === "cpp"
      ? "Running C++ isn't available here yet. You can still write your solution and submit it."
      : buffer?.language === "python" && pythonStatus === "loading"
        ? "Python is still loading in this browser. This happens once per interview and takes a few seconds."
        : buffer?.language === "python" && pythonStatus === "error"
          ? "Python could not be loaded in this browser. You can still write your solution and submit it."
          : null;

  const handleRun = useCallback(async () => {
    if (!current || current.kind !== "coding" || !buffer || isRunning || runBlockedReason) return;
    const questionId = current.id;
    setIsRunning(true);
    setRunNotice(null);
    try {
      // Entirely local: no network call, no backend endpoint involved. See
      // coding-pane-contract.md's "Why this is in the browser" — Run exists
      // so the candidate can check their own work, and nothing here is ever
      // read for scoring, which is what makes running untrusted code in the
      // candidate's own tab safe in the first place.
      const result = await runCodeLocally(buffer.language, buffer.source, current.examples);
      // The agent's question-sync signal (or the local timer fallback) can
      // advance the candidate past this question while a run is still going.
      // A result for a question that is no longer on screen must be
      // dropped, not shown against whatever came next.
      if (currentIdRef.current !== questionId) return;
      setRunResult(result);
    } catch (err) {
      if (currentIdRef.current !== questionId) return;
      setRunResult(null);
      if (err instanceof CppNotRunnableError || err instanceof PythonNotReadyError) {
        setRunNotice({ kind: "unavailable", message: err.message });
      } else {
        setRunNotice({
          kind: "error",
          message:
            err instanceof Error
              ? err.message
              : "Could not run your code in this browser. Please try again.",
        });
      }
    } finally {
      // Always cleared, regardless of whether the question has since moved
      // on: this flag only gates this hook's own next Run call, and must
      // never get stuck true because the candidate advanced mid-request.
      setIsRunning(false);
    }
  }, [current, buffer, isRunning, runBlockedReason]);

  const handleSubmit = useCallback(async () => {
    if (!current || current.kind !== "coding" || !buffer || isSubmitting) return;
    const questionId = current.id;
    setIsSubmitting(true);
    setSubmitNotice(null);
    const ok = await persist(questionId, buffer.language, buffer.source);
    // The notice is only meaningful if the candidate is still looking at
    // this question; isSubmitting always clears, for the same reason as
    // isRunning above.
    if (currentIdRef.current === questionId) {
      setSubmitNotice(
        ok
          ? { kind: "saved", message: "Saved." }
          : { kind: "error", message: "We could not reach the server. Your code is still here, try again." },
      );
    }
    // Dismiss the pane only on a confirmed save. On failure the pane stays
    // open (own comment on persist()'s retry above covers why this can
    // still fail) so "try again" in the notice above is a real button, not
    // a dead end — the candidate's one way to recover is pressing Submit a
    // second time, which a dismissed, unmounted pane would take away.
    if (ok) dismissQuestion(questionId);
    setIsSubmitting(false);
  }, [current, buffer, isSubmitting, persist, dismissQuestion]);

  return {
    questions,
    questionsError,
    current,
    showPane,
    index,
    total,
    buffer,
    setSource,
    setLanguage,
    secondsRemaining,
    warning,
    runResult,
    runNotice,
    isRunning,
    runBlockedReason,
    pythonStatus,
    handleRun,
    submitNotice,
    isSubmitting,
    handleSubmit,
  };
}

export type UseCodingQuestions = ReturnType<typeof useCodingQuestions>;
