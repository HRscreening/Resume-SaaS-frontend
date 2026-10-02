import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Room } from "livekit-client";

import {
  getInterviewQuestions,
  runCode,
  submitCode,
  InterviewApiError,
  InterviewUnavailableError,
  InterviewRetryableError,
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
export function useCodingQuestions(token: string, room: Room | null) {
  const { data, error: questionsError } = useQuery({
    queryKey: ["interview-questions", token],
    queryFn: () => getInterviewQuestions(token),
    // The round's question set is fixed once the interview starts; no
    // in-flight event should ever invalidate it.
    staleTime: Infinity,
  });
  const questions = data?.questions;

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

  const handleExpire = useCallback(() => {
    if (expiringRef.current || !current || !state) return;
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
      }
      // Moving on is only this hook's call while nothing has told it
      // otherwise. Once a sync signal is driving the pane, expiry still
      // captures the buffer above (never discard what they wrote) but leaves
      // deciding what comes next to the agent's own next publish.
      if (syncedQuestionId === null) advance();
      expiringRef.current = false;
    })();
  }, [current, state, persist, advance, syncedQuestionId]);

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

  const handleRun = useCallback(async () => {
    if (!current || current.kind !== "coding" || !buffer || isRunning) return;
    const questionId = current.id;
    setIsRunning(true);
    setRunNotice(null);
    try {
      const result = await runCode(token, {
        question_id: questionId,
        language: buffer.language,
        source: buffer.source,
      });
      // The timer can advance the candidate past this question while the
      // request is still in flight. A result for a question that is no
      // longer on screen must be dropped, not shown against whatever came
      // next.
      if (currentIdRef.current !== questionId) return;
      setRunResult(result);
    } catch (err) {
      if (currentIdRef.current !== questionId) return;
      setRunResult(null);
      if (err instanceof InterviewUnavailableError) {
        setRunNotice({
          kind: "unavailable",
          message: `${err.message} Your code has not been lost. It is saved in this browser, and you can still submit it.`,
        });
      } else if (err instanceof InterviewApiError && err.status === 409) {
        setRunNotice({ kind: "error", message: "This interview session is not active right now." });
      } else if (err instanceof InterviewApiError && err.status === 422) {
        setRunNotice({ kind: "error", message: "This language is not supported for running code." });
      } else if (err instanceof InterviewApiError) {
        setRunNotice({ kind: "error", message: err.message });
      } else if (err instanceof InterviewRetryableError) {
        setRunNotice({ kind: "error", message: err.message });
      } else {
        setRunNotice({ kind: "error", message: "Could not run your code. Please try again." });
      }
    } finally {
      // Always cleared, regardless of whether the question has since moved
      // on: this flag only gates this hook's own next Run call, and must
      // never get stuck true because the candidate advanced mid-request.
      setIsRunning(false);
    }
  }, [current, buffer, isRunning, token]);

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
    setIsSubmitting(false);
  }, [current, buffer, isSubmitting, persist]);

  return {
    questions,
    questionsError,
    current,
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
    handleRun,
    submitNotice,
    isSubmitting,
    handleSubmit,
  };
}

export type UseCodingQuestions = ReturnType<typeof useCodingQuestions>;
