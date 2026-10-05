import type { InterviewExample, InterviewLanguage, RunCodeResponse, RunResultItem } from "@/lib/interviewApi";
import { outputsMatch } from "./outputsMatch";
import { runJavaScriptExample } from "./javascriptRunner";
import { pyodideManager } from "./pyodideManager";

// Thrown for a language this path cannot run at all. Distinct from a crash
// or a timeout: the candidate did nothing wrong, the capability just does
// not exist yet. Caught by useCodingQuestions and shown as an "unavailable"
// notice, same tone as the old server-side 503 it replaces.
export class CppNotRunnableError extends Error {
  constructor() {
    super(
      "Running C++ isn't available here yet. You can still write your solution and submit it; the interviewer will walk through it with you.",
    );
    this.name = "CppNotRunnableError";
  }
}

export class PythonNotReadyError extends Error {
  constructor(reason: "loading" | "error") {
    super(
      reason === "loading"
        ? "Python is still loading in this browser. This happens once per interview and takes a few seconds; try Run again shortly."
        : "Python could not be loaded in this browser. You can still write your solution and submit it.",
    );
    this.name = "PythonNotReadyError";
  }
}

// Runs the candidate's source once per VISIBLE example, entirely in this
// browser tab — see coding-pane-contract.md's "Why this is in the browser":
// nothing here is evidence, so nothing here needs to be trustworthy to
// anyone but the candidate checking their own work. The backend's POST /run
// (Judge0) is deliberately not called from this path at all.
//
// Examples run sequentially, one at a time, mirroring the backend's own
// `ExecutionClient.run` loop in execution.py — there is no reason to
// parallelize a handful of short runs, and for Python it would mean
// multiple concurrent users of the one persistent interpreter worker.
export async function runCodeLocally(
  language: InterviewLanguage,
  source: string,
  examples: InterviewExample[],
): Promise<RunCodeResponse> {
  if (language === "cpp") throw new CppNotRunnableError();
  if (language === "python" && pyodideManager.getStatus() !== "ready") {
    // Wait rather than refuse. Run is deliberately pressable while Pyodide
    // is still loading (see runGate.ts): the candidate gets a "Running"
    // spinner that resolves into real output, instead of a dead button
    // they have to keep poking during a live interview. Only a load that
    // genuinely failed, or one slow past all patience, still throws.
    const ready = await pyodideManager.whenReady();
    if (!ready) {
      throw new PythonNotReadyError(pyodideManager.getStatus() === "error" ? "error" : "loading");
    }
  }

  // A coding question is not guaranteed to carry structured examples: a
  // real authored round put all three of its worked examples into the
  // statement markdown and left `examples` empty. Looping over nothing
  // meant Run executed nothing and reported "0 of 0 examples passed",
  // which to a candidate mid-interview is a broken button. With no
  // examples to check against, Run does the only honest thing left: it
  // runs the code once on empty stdin and shows what it printed.
  if (examples.length === 0) {
    const outcome =
      language === "python"
        ? await pyodideManager.run(source, "")
        : await runJavaScriptExample(source, "");
    return {
      results: [bareRunResult(outcome)],
      compile_error: null,
      ran: 1,
      passed: outcome.timedOut || outcome.crashed ? 0 : 1,
    };
  }

  const results: RunResultItem[] = [];
  for (let index = 0; index < examples.length; index++) {
    const example = examples[index];
    const outcome =
      language === "python"
        ? await pyodideManager.run(source, example.input)
        : await runJavaScriptExample(source, example.input);

    if (outcome.timedOut) {
      results.push({
        index,
        passed: false,
        stdout: "",
        stderr: "Timed out: this took too long to run, which usually means an infinite loop.",
        status: "timeout",
      });
      continue;
    }

    if (outcome.crashed) {
      results.push({
        index,
        passed: false,
        stdout: outcome.stdout,
        stderr: outcome.stderr,
        status: "runtime_error",
      });
      continue;
    }

    // Mirrors execution.py's `_to_example_result`: once the run completed
    // without crashing or timing out, pass/fail is decided purely by
    // comparing stdout with outputsMatch — never by whether stderr happens
    // to contain anything.
    const passed = outputsMatch(example.output, outcome.stdout);
    results.push({
      index,
      passed,
      stdout: outcome.stdout,
      stderr: outcome.stderr,
      status: "ok",
      expected: passed ? undefined : example.output,
      actual: passed ? undefined : outcome.stdout,
    });
  }

  return {
    results,
    // Never set from this path: a "compile error reported once" only makes
    // sense for a compiled language, and the one compiled language on offer
    // (C++) is rejected above before any example runs.
    compile_error: null,
    ran: results.length,
    passed: results.filter((result) => result.passed).length,
  };
}

// One run with nothing to compare against. `status: "output"` rather than
// "ok" so the UI can say "your program ran, here is what it printed"
// instead of implying the code was checked against anything.
function bareRunResult(outcome: {
  stdout: string; stderr: string; crashed: boolean; timedOut: boolean;
}): RunResultItem {
  if (outcome.timedOut) {
    return {
      index: 0,
      passed: false,
      stdout: "",
      stderr: "Timed out: this took too long to run, which usually means an infinite loop.",
      status: "timeout",
    };
  }
  return {
    index: 0,
    passed: !outcome.crashed,
    stdout: outcome.stdout,
    stderr: outcome.stderr,
    status: outcome.crashed ? "runtime_error" : "output",
  };
}
