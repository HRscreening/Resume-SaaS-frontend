import type { InterviewLanguage } from "@/lib/interviewApi";
import type { PyodideStatus } from "./pyodideManager";

// Whether Run can be pressed, and what to tell the candidate.
//
// This used to fold three different situations into one disabled button.
// "Python is still loading" is NOT one of them: Pyodide is ~13MB from a
// CDN, so on a slow connection a candidate reaching a coding question
// early met a dead Run button and a line of explanatory text, pressed it,
// and nothing happened. Waiting is something the machine can do on their
// behalf; a live interview is the worst possible place to ask a person to
// poll a button until it wakes up.
//
// So loading is `blocked: false` with a note. Run presses, says Running,
// and the run itself waits for the interpreter (pyodideManager.whenReady).
// Only two things genuinely cannot run: a language with no browser runner
// at all, and an interpreter that failed to load.
export interface RunGate {
  // Whether Run can be PRESSED. Only a language with no browser runner at
  // all makes this true: a failed Pyodide load does not, because pressing
  // Run retries the load. Once a load failed, leaving the button dead was
  // the whole interview's worth of Run gone over one bad moment at start-up.
  blocked: boolean;
  // Whether a run could actually succeed. Distinct from `blocked`: Python
  // in an error state can still be retried (so not blocked) but cannot be
  // relied on (so not runnable). The Submit gate reads THIS, so it never
  // demands a passing run the candidate has no way to produce.
  canSucceed: boolean;
  // Shown as a standing banner and as the button's disabled reason. Null
  // when there is nothing worth saying.
  note: string | null;
}

export function runGateFor(
  language: InterviewLanguage | undefined,
  pythonStatus: PyodideStatus,
): RunGate {
  if (language === "cpp") {
    return {
      blocked: true,
      canSucceed: false,
      note: "Running C++ isn't available here yet. You can still write your solution and submit it.",
    };
  }
  if (language === "python") {
    if (pythonStatus === "error") {
      return {
        blocked: false,
        canSucceed: false,
        note: "Python could not be loaded. Press Run to try loading it again; if it keeps failing you can still write your solution and submit it.",
      };
    }
    if (pythonStatus === "loading" || pythonStatus === "idle") {
      return {
        blocked: false,
        canSucceed: true,
        note: "Python is still loading in this browser. Run will start as soon as it is ready.",
      };
    }
  }
  return { blocked: false, canSucceed: true, note: null };
}
