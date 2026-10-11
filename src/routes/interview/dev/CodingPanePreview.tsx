import { useEffect, useState } from "react";

import type { InterviewLanguage, RunCodeResponse, SubmitVerdict } from "@/lib/interviewApi";
import CodingPane from "../CodingPane";
import { pyodideManager } from "../execution/pyodideManager";
import { runCodeLocally, runWithInput } from "../execution/runCodeLocally";
import { runGateFor } from "../execution/runGate";
import { submitGateFor } from "../execution/submitGate";
import { usePyodideStatus } from "../execution/usePyodideStatus";
import { starterCodeFor } from "../starterCode";
import Transcript from "../Transcript";
import type { UseCodingQuestions } from "../useCodingQuestions";

// Development only (mounted at /dev/coding-pane, and only when
// import.meta.env.DEV): the coding pane in the same frame the interview
// room gives it, with the real in-browser runners behind Run, and no
// LiveKit room, microphone or session needed. It exists because the pane's
// layout can only be judged by looking at it at a real window size, and the
// only other way to see it is to sit a whole interview.
const QUESTION = {
  id: "q1",
  kind: "coding" as const,
  allocated_minutes: 13,
  presented: true,
  title: "Two Sum",
  statement_md:
    "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.\n\nEach input has exactly one solution, and you may not use the same element twice.\n\n**Input** is read from standard input:\n\n- Line 1: the array, as space-separated integers\n- Line 2: the target\n\n**Output**: print the two indices in ascending order, separated by a space.\n\nWorked examples are shown beside this statement. Press Run to check your solution against them.",
  examples: [
    { input: "2 7 11 15\n9\n", output: "0 1", note: "nums[0] + nums[1] == 9" },
    { input: "3 2 4\n6\n", output: "1 2", note: "nums[1] + nums[2] == 6" },
    { input: "3 3\n6\n", output: "0 1", note: "the same value twice, at two different indices" },
  ],
};

const PARTIAL_VERDICT: SubmitVerdict = {
  passed: 9,
  total: 12,
  by_category: {
    basic: { passed: 4, total: 4 },
    edge: { passed: 3, total: 5 },
    adversarial: { passed: 2, total: 3 },
  },
};

export default function CodingPanePreview() {
  const [language, setLanguage] = useState<InterviewLanguage>("python");
  const [source, setSource] = useState(() => starterCodeFor(QUESTION, "python"));
  const [runResult, setRunResult] = useState<RunCodeResponse | null>(null);
  const [customResult, setCustomResult] = useState<RunCodeResponse | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<SubmitVerdict | null>(null);
  const pythonStatus = usePyodideStatus();

  useEffect(() => pyodideManager.preload(), []);

  const runGate = runGateFor(language, pythonStatus);
  const submitGate = submitGateFor({ runnable: runGate.canSucceed && !runGate.blocked, isRunning, runResult });

  async function run(custom: boolean) {
    setIsRunning(true);
    setNotice(null);
    try {
      if (custom) setCustomResult(await runWithInput(language, source, customInput));
      else setRunResult(await runCodeLocally(language, source, QUESTION.examples));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Run failed.");
    } finally {
      setIsRunning(false);
    }
  }

  const coding = {
    current: QUESTION,
    buffer: { language, source },
    setSource: (next: string) => {
      setSource(next);
      setRunResult(null);
    },
    setLanguage: (next: InterviewLanguage) => {
      setLanguage(next);
      setSource(starterCodeFor(QUESTION, next));
      setRunResult(null);
    },
    secondsRemaining: 742,
    warning: false,
    runResult,
    runNotice: notice ? { kind: "unavailable" as const, message: notice } : null,
    isRunning,
    runBlockedReason: runGate.blocked ? runGate.note : null,
    runNote: runGate.blocked ? null : runGate.note,
    submitBlocked: submitGate.blocked,
    submitBlockedReason: submitGate.note,
    handleRun: () => void run(false),
    submitNotice: null,
    isSubmitting: false,
    handleSubmit: () => setVerdict(PARTIAL_VERDICT),
    verdict,
    handleMoveOn: () => setVerdict(null),
    customInput,
    setCustomInput,
    customResult,
    handleRunCustom: () => void run(true),
  } as unknown as UseCodingQuestions;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: "#F5F3EE" }}>
      <div className="w-full flex items-center justify-between gap-3 px-4 py-3 h-14 text-xs text-[#737373]">
        Coding pane preview (development only)
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden">
          <CodingPane coding={coding} />
        </div>
        <div className="border-t border-[#E5E1D8]" />
        <div className="shrink-0 px-4 py-2">
          <Transcript
            turns={[{ id: "1", speaker: "agent", text: "Take your time. Talk me through your approach whenever you are ready.", final: true }] as never}
            enabled
            onToggle={() => undefined}
            compact
          />
        </div>
      </div>
    </div>
  );
}
