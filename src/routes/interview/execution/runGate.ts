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
  blocked: boolean;
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
      note: "Running C++ isn't available here yet. You can still write your solution and submit it.",
    };
  }
  if (language === "python") {
    if (pythonStatus === "error") {
      return {
        blocked: true,
        note: "Python could not be loaded in this browser. You can still write your solution and submit it.",
      };
    }
    if (pythonStatus === "loading" || pythonStatus === "idle") {
      return {
        blocked: false,
        note: "Python is still loading in this browser. Run will start as soon as it is ready.",
      };
    }
  }
  return { blocked: false, note: null };
}
