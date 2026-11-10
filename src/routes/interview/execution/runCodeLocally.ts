import type { CodingInterviewQuestion, InterviewLanguage } from "@/lib/interviewApi";
import { cleanPythonTraceback } from "./errorTrace";
import { answerMatches, composeProgram, splitResult } from "./harness";
import { runJavaScriptExample } from "./javascriptRunner";
import { pyodideManager } from "./pyodideManager";
import type { RunResult, RunResultItem } from "./runResult";

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

// The part of a question a run needs: its cases, and the driver the server
// generated for each language (absent on a question published before the
// harness, which runs as a plain program).
export type RunnableQuestion = Pick<CodingInterviewQuestion, "examples" | "harness">;

interface Outcome {
  stdout: string;
  stderr: string;
  crashed: boolean;
  timedOut: boolean;
}

// Runs the candidate's code once per VISIBLE example, entirely in this
// browser tab — see coding-pane-contract.md's "Why this is in the browser":
// nothing here is evidence, so nothing here needs to be trustworthy to
// anyone but the candidate checking their own work. Submit runs the very
// same composed program on the sandbox against the hidden checks.
//
// Examples run sequentially, one at a time: there is no reason to
// parallelize a handful of short runs, and for Python it would mean
// multiple concurrent users of the one persistent interpreter worker.
export async function runCodeLocally(
  language: InterviewLanguage,
  source: string,
  question: RunnableQuestion,
): Promise<RunResult> {
  await ensureReady(language);
  const program = composeProgram(source, question.harness?.[language]);
  const harnessed = Boolean(question.harness);

  // A question is not guaranteed to carry examples: a real authored round
  // put all three of its worked examples into the statement markdown and
  // left `examples` empty. Looping over nothing meant Run executed nothing
  // and reported "0 of 0 examples passed", which to a candidate
  // mid-interview is a broken button. With nothing to check against, Run
  // does the only honest thing left: runs the code once and shows what
  // happened.
  if (question.examples.length === 0) return runOnce(language, program, "", harnessed);

  const results: RunResultItem[] = [];
  for (let index = 0; index < question.examples.length; index++) {
    const example = question.examples[index];
    const outcome = await execute(language, program, example.input);
    const { result, printed } = harnessed ? splitResult(outcome.stdout) : { result: null, printed: outcome.stdout };

    if (outcome.timedOut) {
      results.push({ index, passed: false, stdout: "", stderr: TIMEOUT_MESSAGE, status: "timeout" });
      continue;
    }
    if (outcome.crashed) {
      results.push({ index, passed: false, stdout: printed, stderr: outcome.stderr, status: "runtime_error" });
      continue;
    }

    // Once the run completed, pass/fail is decided purely by comparing the
    // answer (harness.ts) — never by whether stderr happens to contain
    // anything.
    const passed = answerMatches(harnessed, example.output, outcome.stdout);
    results.push({
      index,
      passed,
      stdout: printed,
      stderr: outcome.stderr,
      status: "ok",
      expected: passed ? undefined : example.output,
      actual: harnessed ? (result ?? "") : passed ? undefined : outcome.stdout,
    });
  }

  return {
    results,
    // Never set from this path: both languages on offer are interpreted,
    // and a syntax error surfaces as a crash on every example.
    compile_error: null,
    ran: results.length,
    passed: results.filter((result) => result.passed).length,
  };
}

// Runs the code on input of the candidate's own choosing and shows what
// came back. This is how a candidate tries a case the worked examples do
// not cover (an empty list, a duplicate, a negative number) before
// submitting, the way they would in any shared editor in a live interview.
// It compares against nothing, so it reports a result and never a pass or
// a fail, and it has no bearing on whether Submit is unlocked.
export async function runWithInput(
  language: InterviewLanguage,
  source: string,
  question: RunnableQuestion,
  input: string,
): Promise<RunResult> {
  await ensureReady(language);
  return runOnce(language, composeProgram(source, question.harness?.[language]), input, Boolean(question.harness));
}

const TIMEOUT_MESSAGE = "Timed out: this took too long to run, which usually means an infinite loop.";

// Wait for Python rather than refuse. Run is deliberately pressable while
// Pyodide is still loading (see runGate.ts): the candidate gets a "Running"
// spinner that resolves into real output, instead of a dead button they
// have to keep poking during a live interview. Only a load that genuinely
// failed, or one slow past all patience, still throws.
async function ensureReady(language: InterviewLanguage): Promise<void> {
  if (language !== "python" || pyodideManager.getStatus() === "ready") return;
  const ready = await pyodideManager.whenReady();
  if (!ready) {
    throw new PythonNotReadyError(pyodideManager.getStatus() === "error" ? "error" : "loading");
  }
}

// One execution in whichever browser runner the language has. Python's
// traceback is cleaned here; the JavaScript worker cleans its own, because
// only it can measure the line offset its Function wrapper adds.
async function execute(language: InterviewLanguage, program: string, input: string): Promise<Outcome> {
  if (language !== "python") return runJavaScriptExample(program, input);
  const outcome = await pyodideManager.run(program, input);
  return { ...outcome, stderr: cleanPythonTraceback(outcome.stderr) };
}

// One run with nothing to compare against. `status: "output"` rather than
// "ok" so the UI can say "your code ran, here is what came back" instead
// of implying the code was checked against anything.
async function runOnce(
  language: InterviewLanguage,
  program: string,
  input: string,
  harnessed: boolean,
): Promise<RunResult> {
  const outcome = await execute(language, program, input);
  const { result, printed } = harnessed ? splitResult(outcome.stdout) : { result: null, printed: outcome.stdout };
  const item: RunResultItem = outcome.timedOut
    ? { index: 0, passed: false, stdout: "", stderr: TIMEOUT_MESSAGE, status: "timeout" }
    : {
        index: 0,
        passed: !outcome.crashed,
        stdout: printed,
        stderr: outcome.stderr,
        status: outcome.crashed ? "runtime_error" : "output",
        actual: result ?? undefined,
      };
  return { results: [item], compile_error: null, ran: 1, passed: item.passed ? 1 : 0 };
}
