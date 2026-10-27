import { useEffect, useRef, useState } from "react";
import type { Room, TextStreamHandler } from "livekit-client";

const TOPIC = "hiresort.question";

// Shape published on this topic: {"index": 2, "question_id": "q3"} — the
// server's own ordered question pointer (see
// .superpowers/sdd/2026-09-28-interview-round-authoring/question-state-machine.md:
// "the server owns an ordered question pointer... hiresort.question
// publishes the pointer, not an inference"). `index` is not read here even
// though it is authoritative: looking the id up in this round's own
// already-loaded question list (useCodingQuestions does this) is what
// guarantees the pinned content, the progress counter, and this id can
// never disagree, since all three then read one derived value instead of
// three independently-sent ones.
interface QuestionSignal {
  question_id: unknown;
}

function parseQuestionId(raw: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const id = (parsed as QuestionSignal).question_id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

// Subscribes to the `hiresort.question` text-stream topic the server
// publishes the question pointer on (same transport and pattern as
// useLiveCaptions' `lk.transcription` subscription), and resolves to the id
// of the question the pointer currently names.
//
// This is the one signal that decides which question is current, full stop
// — not an inference from transcript coverage, not a local index, nothing
// this hook or its caller guesses. Everything else about it is deliberately
// conservative:
//
// - No signal yet (data channel never arrives, the pointer is still
//   `not_started` — the warm-up — or the server hasn't published its first
//   tick after a remount) returns null. The caller shows nothing pinned and
//   no pane for null, which is the correct, honest state for "nothing
//   presented yet" — there is no "show the first coding question anyway"
//   fallback any more. An interview where this signal never arrives at all
//   must still be a usable interview: by voice only, with no claim ever made
//   about a question on screen.
// - `knownQuestionIds` is required to accept an id. A signal naming a
//   question this round's candidate-facing question list has never heard of
//   — a stale publish, or a race before GET /questions has loaded — is
//   dropped rather than steering the pane at an id nothing can render for.
//   The server republishes on a short interval regardless, so a dropped
//   tick here is corrected by the next one once the question list is known.
// - Once a valid, known id has been adopted, it is never reverted to null by
//   a later malformed or unknown message — the pane keeps showing the last
//   question it was confidently told about rather than blanking out over a
//   single bad tick.
export function useQuestionSync(
  room: Room | null,
  knownQuestionIds: ReadonlySet<string> | null,
): string | null {
  const [questionId, setQuestionId] = useState<string | null>(null);

  // Read inside the handler via a ref so the subscribe effect below depends
  // only on `room`: re-subscribing the text-stream handler every time the
  // question list refetches (it shouldn't, but it also must not matter)
  // would risk missing a message published in the gap between unregister and
  // register.
  const knownIdsRef = useRef(knownQuestionIds);
  knownIdsRef.current = knownQuestionIds;

  useEffect(() => {
    if (!room) return;

    const handler: TextStreamHandler = async (reader) => {
      let text = "";
      try {
        for await (const chunk of reader) text += chunk;
      } catch {
        // Transport tore down mid-read (room disconnect, unmount). Nothing
        // candidate-facing to show for a teardown mid-publish; the next tick
        // after reconnect corrects it.
        return;
      }
      const id = parseQuestionId(text);
      if (id === null) return; // malformed payload — ignore, keep the last known-good value
      // No question list yet, or an id it doesn't contain: ignore this tick
      // rather than steering the pane at something nothing can render for.
      // The agent republishes on a short interval, so a later tick — once
      // the list is loaded — corrects this.
      if (!knownIdsRef.current || !knownIdsRef.current.has(id)) return;
      setQuestionId(id);
    };

    room.registerTextStreamHandler(TOPIC, handler);
    return () => room.unregisterTextStreamHandler(TOPIC);
  }, [room]);

  return questionId;
}
