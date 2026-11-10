import type { InterviewLanguage } from "@/lib/interviewApi";
import type { PyodideStatus } from "./pyodideManager";

// What to tell the candidate about Run, and whether a run could succeed.
//
// Run is always pressable. "Python is still loading" is NOT a reason to
// disable it: Pyodide is ~13MB from a CDN, so on a slow connection a
// candidate reaching a coding question early met a dead Run button and a
// line of explanatory text, pressed it, and nothing happened. Waiting is
// something the machine can do on their behalf; a live interview is the
// worst possible place to ask a person to poll a button until it wakes up.
// So loading is a note, and the run itself waits for the interpreter
// (pyodideManager.whenReady). A failed load is retried by the next press.
export interface RunGate {
  // Whether a run could actually succeed. Python in an error state can
  // still be retried but cannot be relied on. The Submit gate reads THIS,
  // so it never demands a passing run the candidate has no way to produce.
  canSucceed: boolean;
  // Shown as a standing banner. Null when there is nothing worth saying.
  note: string | null;
}

export function runGateFor(language: InterviewLanguage | undefined, pythonStatus: PyodideStatus): RunGate {
  if (language === "python") {
    if (pythonStatus === "error") {
      return {
        canSucceed: false,
        note: "Python could not be loaded. Press Run to try loading it again; if it keeps failing you can still write your solution and submit it.",
      };
    }
    if (pythonStatus === "loading" || pythonStatus === "idle") {
      return {
        canSucceed: true,
        note: "Python is still loading in this browser. Run will start as soon as it is ready.",
      };
    }
  }
  return { canSucceed: true, note: null };
}
