import type { RunCodeResponse } from "@/lib/interviewApi";

// Whether Submit can be pressed yet.
//
// A candidate submitted a Two Sum answer that was never run once — it was
// a LeetCode-style method that printed nothing — and the interviewer only
// found out at scoring time. Submit is the end of the question, so it
// should mean "I checked this", not "I typed something".
//
// The hard constraint on this rule: it must never trap someone. Submit is
// the only way to finish a question by hand, so requiring a passing run
// where no run is POSSIBLE (C++ has no browser runner; Pyodide can fail to
// load) would leave the candidate with no way out at all. In those cases
// the gate stands down completely. The question timer's auto-save is a
// separate path (useCodingQuestions.handleExpire persists directly), so
// work is still captured even when this gate never opens.
export interface SubmitGate {
  blocked: boolean;
  note: string | null;
}

export function submitGateFor({
  runnable,
  isRunning,
  runResult,
}: {
  // False when this language cannot be executed here at all. The gate is
  // off in that case, by design: see the note above.
  runnable: boolean;
  isRunning: boolean;
  runResult: RunCodeResponse | null;
}): SubmitGate {
  if (!runnable) return { blocked: false, note: null };

  if (isRunning) {
    return { blocked: true, note: "Wait for the run to finish." };
  }

  // runResult is cleared the moment the source or language changes (see
  // useCodingQuestions), so a pass can never be carried over to code it
  // was not actually a pass for.
  if (!runResult) {
    return {
      blocked: true,
      note: "Run your code first. Submit unlocks once it passes.",
    };
  }

  if (runResult.compile_error) {
    return { blocked: true, note: "Fix the compile error, then run again." };
  }

  if (runResult.passed < runResult.ran) {
    const failed = runResult.ran - runResult.passed;
    return {
      blocked: true,
      note:
        runResult.ran === 1
          ? "Your code did not run cleanly. Fix it and run again."
          : `${failed} of ${runResult.ran} examples still failing. Submit unlocks when they all pass.`,
    };
  }

  return { blocked: false, note: null };
}
