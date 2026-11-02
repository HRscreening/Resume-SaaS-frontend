import { useMemo, useRef } from "react";

import type { CaptionLine } from "./useLiveCaptions";

export interface TranscriptTurn {
  id: string;
  speaker: "interviewer" | "candidate";
  text: string;
  final: boolean;
}

// Presentation-only merge of the two independent, per-speaker lists
// useLiveCaptions produces into one chronological transcript. This is the
// whole of how the two-column layout becomes a single column: it does not
// touch useLiveCaptions, and it does not re-derive final/delta-vs-replace
// semantics, which stay exactly as that hook already resolved them per line.
//
// Ordering problem: useLiveCaptions gives two lists, each already in
// arrival order for its own speaker, but with no shared timestamp to
// interleave them by. This assigns each line's id a sequence number the
// first time it is seen (in whichever list it first appears), and keeps
// that number for the line's lifetime — later chunks for the same id only
// update its text/final in place and never change its position. Since both
// streams arrive over the same live connection in real time, first-seen
// order is, in practice, speaking order; this is a reading aid, not the
// scored transcript, so being off by the width of network jitter on an
// occasional overlap is an accepted tradeoff, not a correctness bug.
export function useTranscript(
  agentCaptions: CaptionLine[],
  candidateCaptions: CaptionLine[],
): TranscriptTurn[] {
  const seqRef = useRef<Map<string, number>>(new Map());
  const nextSeqRef = useRef(0);

  return useMemo(() => {
    function assignSeq(id: string): number {
      const existing = seqRef.current.get(id);
      if (existing !== undefined) return existing;
      const seq = nextSeqRef.current;
      nextSeqRef.current += 1;
      seqRef.current.set(id, seq);
      return seq;
    }

    const withSeq = [
      ...agentCaptions.map((line) => toTurn(line, "interviewer", assignSeq)),
      ...candidateCaptions.map((line) => toTurn(line, "candidate", assignSeq)),
    ];

    return withSeq
      .sort((a, b) => a.seq - b.seq)
      .map((turn) => ({ id: turn.id, speaker: turn.speaker, text: turn.text, final: turn.final }));
    // Only recomputed when one of the two source lists actually gets a new
    // array identity, which useLiveCaptions does exclusively via its own
    // setState calls on real transcription activity — not on, say, the
    // once-a-second elapsed-time re-render happening elsewhere on this
    // screen. That stability is what keeps the transcript's auto-scroll
    // effect (keyed on this same array) from re-firing every second.
  }, [agentCaptions, candidateCaptions]);
}

function toTurn(
  line: CaptionLine,
  speaker: TranscriptTurn["speaker"],
  assignSeq: (id: string) => number,
): TranscriptTurn & { seq: number } {
  const id = `${speaker}:${line.id}`;
  return { id, speaker, text: line.text, final: line.final, seq: assignSeq(id) };
}
