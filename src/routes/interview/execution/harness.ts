import type { FunctionSignature } from "@/lib/interviewApi";

// The browser half of the function harness (backend
// app/modules/interview/harness.py). The candidate implements one function;
// the server sends, per language, a driver that reads a case's arguments
// from stdin (one JSON value per line), calls the function and writes the
// returned value on one marked line. Run appends that driver to the
// candidate's code here, exactly as Submit does on the sandbox, so the two
// can never disagree about how the code is called.
//
// What is compared is the returned VALUE, parsed from JSON, not text: a
// list spelled with or without spaces is the same answer, and anything the
// candidate prints while debugging is shown to them and never judged.
//
// The marker is the one string both halves must agree on. Do not change it
// here without changing harness.py first.
export const RESULT_MARKER = "__HIRESORT_RESULT__ ";

// Numbers closer than this are the same answer (harness.py's tolerance).
const FLOAT_TOLERANCE = 1e-6;

// The program that actually runs: the candidate's code with the driver
// after it. A question published before the harness has no driver and
// runs as the plain program it was written as.
export function composeProgram(source: string, driver: string | undefined): string {
  if (!driver) return source;
  return `${source.replace(/\n+$/, "")}\n${driver}`;
}

// Separates the returned value (the last marked line the driver wrote)
// from everything else the program printed.
export function splitResult(stdout: string): { result: string | null; printed: string } {
  let result: string | null = null;
  const printed: string[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (line.startsWith(RESULT_MARKER)) result = line.slice(RESULT_MARKER.length).trim();
    else printed.push(line);
  }
  return { result, printed: printed.join("\n").replace(/\s+$/, "") };
}

function equal(a: unknown, b: unknown): boolean {
  if (typeof a === "boolean" || typeof b === "boolean") return a === b;
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) <= Math.max(FLOAT_TOLERANCE, FLOAT_TOLERANCE * Math.max(Math.abs(a), Math.abs(b)));
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => equal(x, b[i]));
  }
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const ka = Object.keys(a as object).sort();
    const kb = Object.keys(b as object).sort();
    return (
      ka.length === kb.length &&
      ka.every((k, i) => k === kb[i] && equal((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
    );
  }
  return a === b;
}

// Whether two JSON texts are the same answer.
export function valuesMatch(expected: string, actual: string | null): boolean {
  if (actual === null) return false;
  try {
    return equal(JSON.parse(expected), JSON.parse(actual));
  } catch {
    return false;
  }
}

// Text comparison for a question published before the harness: trimmed,
// line by line, ignoring trailing whitespace. Leading whitespace still
// matters, so a wrongly indented answer never passes.
export function outputsMatch(expected: string, actual: string): boolean {
  const lines = (text: string) => {
    const trimmed = text.replace(/[ \t\n\r\f\v]+$/, "");
    return trimmed === "" ? [] : trimmed.split(/\r\n|\r|\n/).map((line) => line.replace(/[ \t\r\f\v]+$/, ""));
  };
  const e = lines(expected);
  const a = lines(actual);
  return e.length === a.length && e.every((line, i) => line === a[i]);
}

// Whether a run's stdout is the expected answer, by whichever rule this
// question uses.
export function answerMatches(harnessed: boolean, expected: string, stdout: string): boolean {
  if (!harnessed) return outputsMatch(expected, stdout);
  return valuesMatch(expected, splitResult(stdout).result);
}

// A case's arguments as a person reads them: "nums = [2,7,11,15], target = 9".
export function formatCall(signature: FunctionSignature, input: string): string {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length !== signature.params.length) return lines.join(", ");
  return signature.params.map((p, i) => `${p.name} = ${lines[i]}`).join(", ");
}
