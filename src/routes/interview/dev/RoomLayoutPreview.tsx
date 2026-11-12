import { useState } from "react";

import RoomLayout from "../RoomLayout";
import type { PresenceState } from "../presenceState";
import type { InterviewPhase } from "../phaseSignal";
import { starterCodeFor } from "../starterCode";
import type { UseCodingQuestions } from "../useCodingQuestions";
import type { TranscriptTurn } from "../useTranscript";

// Development only (mounted at /dev/interview-room): the whole connected
// screen, Direction C, with sample data and no LiveKit room. Buttons switch
// between the moments of the hour so each can be judged at a real size.
const QUESTIONS = [
  { id: "q1", kind: "spoken" as const, allocated_minutes: 5, presented: true },
  { id: "q2", kind: "spoken" as const, allocated_minutes: 5, presented: true },
  {
    id: "q3",
    kind: "spoken" as const,
    allocated_minutes: 6,
    presented: true,
    prompt: "Tell me about a time a service you owned couldn't keep up with traffic. What did you change, and why?",
  },
  {
    id: "q4",
    kind: "coding" as const,
    allocated_minutes: 15,
    presented: true,
    title: "Merge overlapping bookings",
    statement_md:
      "You're given `bookings`, a list of room bookings, each a `[start, end]` pair of hours. Merge every pair that overlaps or touches and return the merged bookings in order of start time.\n\n**Constraints**\n\n- 0 ≤ len(bookings) ≤ 10^4\n- 0 ≤ start < end ≤ 24",
    signature: {
      name: "merge_bookings",
      params: [{ name: "bookings", type: "int[][]" }],
      returns: "int[][]",
    },
    examples: [
      { input: "[[1,3],[2,6],[8,10]]", output: "[[1,6],[8,10]]", note: "1–3 and 2–6 overlap" },
      { input: "[[1,4],[4,5]]", output: "[[1,5]]", note: "touching bookings merge too" },
    ],
    starter_code: {
      python: "from typing import List\n\n\ndef merge_bookings(bookings: List[List[int]]) -> List[List[int]]:\n    # Write your solution here\n    pass\n",
    },
  },
  { id: "q5", kind: "spoken" as const, allocated_minutes: 4, presented: false },
  { id: "q6", kind: "spoken" as const, allocated_minutes: 4, presented: false },
];

const TURNS: TranscriptTurn[] = [
  { id: "c1", speaker: "candidate", text: "Reports lagged by about ten minutes, which finance was fine with.", final: true },
  {
    id: "i1",
    speaker: "interviewer",
    text: "Thanks. Next one: tell me about a time a service you owned couldn't keep up with traffic. What did you change, and why?",
    final: true,
  },
];

type Moment = "warm-up" | "spoken" | "coding" | "walkthrough" | "closing";
const MOMENTS: Moment[] = ["warm-up", "spoken", "coding", "walkthrough", "closing"];
const PRESENCE: PresenceState[] = ["speaking", "listening", "thinking"];

export default function RoomLayoutPreview() {
  const [moment, setMoment] = useState<Moment>("spoken");
  const [presence, setPresence] = useState<PresenceState>("speaking");
  const [camera, setCamera] = useState(true);
  const [captions, setCaptions] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [source, setSource] = useState(() => starterCodeFor(QUESTIONS[3], "python"));

  const index = moment === "warm-up" ? -1 : moment === "spoken" ? 2 : moment === "closing" ? 5 : 3;
  const current = index >= 0 ? QUESTIONS[index] : undefined;
  const phase: InterviewPhase =
    moment === "warm-up" ? "opening" : moment === "closing" ? "closing" : moment === "spoken" ? "spoken" : (moment as InterviewPhase);

  const coding = {
    questions: QUESTIONS,
    current,
    index,
    total: QUESTIONS.length,
    finished: false,
    showPane: moment === "coding",
    pinned: moment === "spoken" ? { id: "q3", prompt: QUESTIONS[2].prompt } : null,
    walkthrough: moment === "walkthrough" ? { title: "Merge overlapping bookings" } : null,
    secondsRemaining: moment === "coding" ? 700 : 288,
    warning: false,
    timerActive: moment !== "closing" && moment !== "warm-up",
    buffer: { language: "python", source },
    setSource,
    setLanguage: () => undefined,
    runResult: null,
    runNotice: null,
    isRunning: false,
    runNote: null,
    submitBlocked: true,
    submitBlockedReason: "Run the examples first. Submit unlocks when they all pass.",
    handleRun: () => undefined,
    submitNotice: null,
    isSubmitting: false,
    handleSubmit: () => undefined,
    verdict: null,
    handleMoveOn: () => undefined,
    customInput: "",
    setCustomInput: () => undefined,
    customResult: null,
    handleRunCustom: () => undefined,
  } as unknown as UseCodingQuestions;

  return (
    <div className="relative">
      <div className="fixed right-3 bottom-24 z-50 flex flex-col gap-1.5 rounded-xl border border-[#D4D4D4] bg-white/95 p-2 text-xs shadow-sm">
        <div className="flex flex-wrap gap-1">
          {MOMENTS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMoment(m)}
              className={`h-7 px-2 rounded-md border ${m === moment ? "bg-[#0F0F0F] text-white" : "bg-white"}`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 items-center">
          {PRESENCE.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPresence(s)}
              className={`h-7 px-2 rounded-md border ${s === presence ? "bg-[#C85A17] text-white" : "bg-white"}`}
            >
              {s}
            </button>
          ))}
          <label className="ml-1 flex items-center gap-1">
            <input type="checkbox" checked={camera} onChange={(e) => setCamera(e.target.checked)} /> camera
          </label>
        </div>
      </div>
      <RoomLayout
        coding={coding}
        phase={phase}
        ending={false}
        presenceState={presence}
        interviewerArrival="present"
        reconnecting={false}
        networkLabel={null}
        silenceWarning={false}
        showFiveMinuteNotice={false}
        voice={{
          interviewerAnalyser: null,
          candidateAnalyser: null,
          interviewerSpeaking: presence === "speaking",
          candidateSpeaking: presence === "listening",
        }}
        transcriptTurns={moment === "warm-up" ? [] : TURNS}
        captionsEnabled={captions}
        onToggleCaptions={() => setCaptions((c) => !c)}
        micOn={micOn}
        onToggleMic={() => setMicOn((m) => !m)}
        agentHasSpoken
        requiresCamera={camera}
        roleTitle="Senior Backend Engineer"
        hiringCompany="Acme"
        durationMinutes={60}
        elapsedLabel="22:14"
        timeLeftLabel="37:46 left"
        onRepeat={() => undefined}
        onDone={() => undefined}
        momentActive={false}
        onMoment={() => undefined}
        onLeave={() => undefined}
      />
    </div>
  );
}
