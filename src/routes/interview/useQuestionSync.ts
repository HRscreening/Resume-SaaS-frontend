import { useEffect, useRef, useState } from "react";
import type { Room, TextStreamHandler } from "livekit-client";

const TOPIC = "hiresort.question";

// Shape published by voice_agent.agent.run_question_sync (see
// coding-pane-contract.md's ADDENDUM): {"index": 2, "question_id": "q3"}.
// `index` is not used here — the question list is already loaded and keyed
// by id, so looking a question up by id is strictly more robust than trusting
// the agent's own position in a plan the frontend never fully mirrors.
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

// Subscribes to the `hiresort.question` text-stream topic the agent
// publishes on (same transport and pattern as useLiveCaptions' `lk.transcription`
// subscription), and resolves to the id of the question the agent currently
// has in progress.
//
// This is the one signal that decides which question the coding pane shows;
// everything else about it is deliberately conservative:
//
// - No signal yet (data channel never arrives, or the agent hasn't published
//   its first tick) returns null, and the caller's own fallback — show the
//   first coding question, say nothing about sync — applies untouched. An
//   interview where this never arrives must still be a usable interview.
// - `knownQuestionIds` is required to accept an id. A signal naming a
//   question this round's candidate-facing question list has never heard of
//   — a stale publish, a race before GET /questions has loaded, a plan drift
//   on the agent's side — is dropped rather than steering the pane at an id
//   nothing can render for. The agent republishes on a short interval
//   regardless (ADDENDUM: "re-publishing the same value is harmless and
//   self-correcting"), so a dropped tick here is corrected by the next one
//   once the question list is known.
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
