import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

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
// no audio or caption state — that stays in InterviewRoom and is threaded
// into CodingPane separately, so this hook has nothing to do with the
// LiveKit Room and can be reasoned about on its own.
//
// Progression through the round is driven entirely by this hook's own
// per-question timer, not by anything the agent sends over the room: the
// contract defines no such signal, and "every candidate gets exactly
// allocated_minutes, so scorecards stay comparable" is itself an argument
// against letting an early manual Submit skip ahead — only the timer
// advances the candidate to the next question.
export function useCodingQuestions(token: string) {
  const { data, error: questionsError } = useQuery({
    queryKey: ["interview-questions", token],
    queryFn: () => getInterviewQuestions(token),
    // The round's question set is fixed once the interview starts; no
    // in-flight event should ever invalidate it.
    staleTime: Infinity,
  });
  const questions = data?.questions;

  const [state, setState] = useState<CodingState | null>(null);
  const expiringRef = useRef(false);

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
      if (stored && stored.index < questions.length) return stored;
      const first = questions[0];
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

  const index = state?.index ?? 0;
  const total = questions?.length ?? 0;
  const current = questions && state ? questions[state.index] : undefined;
  const buffer = current ? bufferFor(state?.buffers ?? {}, current.id) : null;

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
  const persist = useCallback(
    async (questionId: string, language: InterviewLanguage, source: string): Promise<boolean> => {
      try {
        await submitCode(token, { question_id: questionId, language, source });
        return true;
      } catch {
        // One retry: most failures here are a single dropped request, and a
        // candidate who just ran out of time should not lose their answer
        // to one bad network blip.
        try {
          await submitCode(token, { question_id: questionId, language, source });
          return true;
        } catch {
          return false;
        }
      }
    },
    [token],
  );

  const advance = useCallback(() => {
    setState((prev) => {
      if (!prev || !questions) return prev;
      const nextIndex = prev.index + 1;
      const next = questions[nextIndex];
      return {
        ...prev,
        index: nextIndex,
        deadlineAt: next ? Date.now() + minutesToMs(next.allocated_minutes) : null,
      };
    });
  }, [questions]);

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
      advance();
      expiringRef.current = false;
    })();
  }, [current, state, persist, advance]);

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
