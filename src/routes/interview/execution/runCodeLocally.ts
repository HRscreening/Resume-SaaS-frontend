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
    throw new PythonNotReadyError(pyodideManager.getStatus() === "error" ? "error" : "loading");
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
