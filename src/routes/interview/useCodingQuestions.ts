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
// WHICH QUESTION IS CURRENT is decided by the server, not by this hook, and
// not by the model either — see
// .superpowers/sdd/2026-09-28-interview-round-authoring/question-state-machine.md.
// The server owns an ordered question pointer; `useQuestionSync` follows the
// room's `hiresort.question` topic that pointer publishes, and that id —
// once this round's question list confirms it is one of ITS ids — is the
// ONLY thing `current` ever resolves to. There is no other path to a value:
// no local index that advances on its own timer, no "show question 0 until
// the first signal arrives." Before the pointer has named anything (the
// warm-up, or the gap right after a remount while the next publish tick is
// still in flight), `current` is `undefined` and stays that way — nothing is
// pinned, no pane is shown, and "Question N of M" renders nothing, exactly
// together, because all three read this same value. They cannot disagree,
// because there is only ever one value to read.
//
// The per-question timer is unconditional, but it has nothing to do with
// what is displayed: whichever question `current` resolves to gets its own
// fresh countdown against its own `allocated_minutes`, for the warning and
// the auto-submit on expiry only (see the `deadlineOwnerRef` effect below).
// It never advances anything — see `handleExpire`, which persists a timed-out
// coding answer and nothing more; moving the pointer on is the server's
// call, made when the model asks for the next question, not a local clock's.
//
// `showPane` is `current?.kind === "coding"` and nothing else (plus
// `dismissed`, below) — no heuristics, no timers, no fallback. A question id
// the candidate has already submitted (`dismissed`) keeps the pane closed
// for good even if the pointer republishes that id again (a repeated tick,
// or the interviewer genuinely moving back to it).
export function useCodingQuestions(token: string, room: Room | null) {
  const { data, error: questionsError, refetch } = useQuery({
    queryKey: ["interview-questions", token],
    queryFn: () => getInterviewQuestions(token),
    // The round's question set is fixed once the interview starts; no
    // in-flight event should ever invalidate it. A spoken question's
    // *text* is the one thing that can still change on this same cached
    // list — see the refetch-on-reveal effect below, which calls
    // `refetch()` explicitly rather than relying on staleTime.
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
  // Lets the id-change effect below tell "the pointer just named a new
  // question, give it a fresh countdown" apart from "nothing changed, leave
  // the restored/ticking deadline alone" — the two cases a plain `[current]`
  // effect dependency cannot distinguish between on its own. Set directly
  // (not via setState) by the mount effect below, synchronously with the
  // state it establishes, so the id-change effect never fires spuriously on
  // first mount or on a reload that is restoring an in-progress countdown.
  const deadlineOwnerRef = useRef<string | null>(null);

  // Restore a prior mount's progress (a reload, a remount after a
  // reconnect) — buffers, the dismissed set, and which question the stored
  // countdown belongs to — or start from nothing. Deliberately independent
  // of `questions`: this state is pure bookkeeping (code the candidate
  // wrote, a countdown, what has been submitted), never which question is
  // current, so it has nothing to wait on the question list for. The `prev`
  // guard makes this run at most once per mount.
  useEffect(() => {
    setState((prev) => {
      if (prev) return prev;
      const stored = loadCodingState(token);
      if (stored) {
        deadlineOwnerRef.current = stored.deadlineQuestionId;
        return stored;
      }
      deadlineOwnerRef.current = null;
      return { deadlineAt: null, deadlineQuestionId: null, buffers: {}, dismissed: {} };
    });
  }, [token]);

  // Persisted on every change, slightly debounced so fast typing does not
  // turn into a synchronous sessionStorage write per keystroke while live
  // call audio is active.
  useEffect(() => {
    if (!state) return;
    const id = window.setTimeout(() => saveCodingState(token, state), 250);
    return () => window.clearTimeout(id);
  }, [state, token]);

  // THE single source for which question is current, full stop. Resolved by
  // looking the pointer's id up in this round's own question list — never by
  // trusting a separately-sent index, and never by falling back to anything
  // local — so that this number, the pinned content below, and the coding
  // pane's gate are all reading the exact same value and can never disagree.
  // `-1` (and therefore `current === undefined`) means the pointer has not
  // named a known question yet: the warm-up, or the gap right after a
  // remount before the next publish tick lands. It is never defaulted to 0.
  const index = useMemo(
    () => (questions && syncedQuestionId ? questions.findIndex((q) => q.id === syncedQuestionId) : -1),
    [questions, syncedQuestionId],
  );
  const total = questions?.length ?? 0;
  const current = index !== -1 && questions ? questions[index] : undefined;
  const buffer = current ? bufferFor(state?.buffers ?? {}, current.id) : null;

  // Question ids the candidate has already submitted (Submit, or the
  // timeout auto-submit) — see CodingState.dismissed. Checked by id, not by
  // index, so it survives the pane being re-shown at a different index
  // later and still recognises "I've already finished this one."
  const dismissedIds = state?.dismissed;
  const isCurrentDismissed = Boolean(current && dismissedIds?.[current.id]);

  // The coding pane opens if and only if the current question's kind is
  // "coding" — no timers, no heuristics, no local index deciding anything.
  // `current` is already gated on the pointer above, so there is no separate
  // "has a real signal arrived" check to repeat here.
  //
  // A dismissed question is the other way to fail this gate: once
  // submitted (manually or by timeout), the pane for that question id
  // never reopens, even if the pointer republishes it or moves back to it —
  // see handleSubmit/handleExpire below for where `dismissed` gets set.
  const showPane = current?.kind === "coding" && !isCurrentDismissed;

  // The pinned slot's SPOKEN half. (The coding half reuses `current` +
  // `showPane` above unchanged — coding content is always fully present,
  // so it never has anything to wait for.) A spoken question's `prompt` is
  // withheld server-side until the interviewer actually presents it — see
  // interviewApi.ts — so this hook can know THAT a spoken question is
  // current (via the pointer) before it knows WHAT IT SAYS. `pinned`
  // resolves to the former only once the latter has arrived, and is
  // deliberately NOT sticky across a change of question: it clears the
  // instant `current` stops being a revealed spoken question — moved to a
  // coding question, or to a new spoken one whose text has not arrived yet
  // — rather than holding the PREVIOUS question's text on screen under a
  // new one's pointer value. A brief "nothing pinned" gap (which renders
  // identically to the pre-presentation state, by design) is the honest
  // state while this hook waits on the refetch below; showing stale text
  // would not be.
  const [pinned, setPinned] = useState<{ id: string; prompt: string } | null>(null);
  useEffect(() => {
    if (current?.kind === "spoken" && typeof current.prompt === "string") {
      setPinned({ id: current.id, prompt: current.prompt });
    } else {
      setPinned(null);
    }
  }, [current]);

  // The one place this hook polls nothing and waits for nothing: a spoken
  // question's reveal happens server-side at the moment the interviewer
  // presents it, so the only thing the client needs to do is ask again once
  // the agent's own signal says a question is current that this client does
  // not yet have text for. Bounded to a handful of short retries (never an
  // open-ended interval) to absorb the brief gap between the signal
  // arriving and the server's own write landing, not to paper over a
  // question that will never be revealed.
  const refetchedForIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!syncedQuestionId || !questions) return;
    const synced = questions.find((q) => q.id === syncedQuestionId);
    if (!synced || synced.kind !== "spoken" || typeof synced.prompt === "string") return;
    if (refetchedForIdRef.current === syncedQuestionId) return;
    refetchedForIdRef.current = syncedQuestionId;

    let cancelled = false;
    (async function retry(attempt: number) {
      const result = await refetch();
      if (cancelled) return;
      const updated = result.data?.questions.find((q) => q.id === syncedQuestionId);
      if (updated && updated.kind === "spoken" && typeof updated.prompt === "string") return;
      if (attempt >= 3) return;
      window.setTimeout(() => {
        if (!cancelled) retry(attempt + 1);
      }, attempt * 800);
    })(1);

    return () => {
      cancelled = true;
    };
  }, [syncedQuestionId, questions, refetch]);

  // The timer belongs to whichever question the pointer names, and only
  // that: give it a fresh countdown against its own `allocated_minutes` the
  // moment the pointer moves to a different question, forward, backward, or
  // to one the pointer was never on before in this mount. A restored
  // deadline (mount effect above already primed deadlineOwnerRef from
  // `deadlineQuestionId` to match) is left untouched, which is what
  // preserves true remaining time across a reload instead of resetting it
  // to a fresh full allocation the instant the pointer republishes the same
  // question.
  useEffect(() => {
    const id = current?.id ?? null;
    if (deadlineOwnerRef.current === id) return;
    deadlineOwnerRef.current = id;
    setState((prev) => {
      if (!prev) return prev;
      if (!current) return { ...prev, deadlineAt: null, deadlineQuestionId: null };
      return {
        ...prev,
        deadlineAt: Date.now() + minutesToMs(current.allocated_minutes),
        deadlineQuestionId: current.id,
      };
    });
  }, [current]);

  const [runResult, setRunResult] = useState<RunCodeResponse | null>(null);
  const [runNotice, setRunNotice] = useState<RunNotice | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [submitNotice, setSubmitNotice] = useState<SubmitNotice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read inside the async handlers below so a Run or Submit request that is
  // still in flight when the pointer moves the candidate on (mid-request)
  // applies its result only if it is still talking about the question
  // currently on screen. Without this, a slow Run response for question 1
  // could land on question 2's results panel after the pointer advances.
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

  // Captures a timed-out coding answer and nothing more. Moving the pointer
  // on is never this hook's call — see the module comment — so there is no
  // "advance" branch here any more: a spoken question's timer firing does
  // nothing (there is no buffer to capture for it), and a coding question's
  // firing persists the buffer and dismisses it, leaving the server's own
  // pointer to decide what, if anything, happens next.
  const handleExpire = useCallback(() => {
    if (expiringRef.current || !current || !state) return;
    // Already submitted (manually, or by an earlier expiry) — the pane for
    // this id is closed for good (see `showPane`), so there is nothing left
    // to capture and nowhere for a notice to be seen. Without this guard a
    // countdown that is still ticking for a dismissed-but-current question
    // (the pointer named it again after the candidate moved on) would
    // re-submit the same buffer on every expiry.
    if (state.dismissed[current.id]) return;
    if (current.kind !== "coding") return;
    expiringRef.current = true;
    (async () => {
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
      expiringRef.current = false;
    })();
  }, [current, state, persist, dismissQuestion]);

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
      // The pointer can move the candidate past this question (the server
      // advanced it) while a run is still going. A result for a question
      // that is no longer on screen must be dropped, not shown against
      // whatever came next.
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
    pinned,
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
