// Turns what a crashed run leaves on stderr into something a candidate can
// act on in the middle of an interview: which line of THEIR code, and what
// went wrong. The raw text is a traceback through this app's own runner
// (Pyodide's exec wrapper, the worker's Function shim), with line numbers
// that are off by however many lines that wrapper adds.
//
// Both runners are reduced to the same shape, deepest call last:
//
//   Line 16, in main
//   Line 5, in two_sum
//   NameError: name 'seen' is not defined

const PY_HEADER = "Traceback (most recent call last):";
// The candidate's source is exec'd from a string, so its frames are
// "<string>". "<exec>" is the wrapper around it.
const PY_OWN_FRAME = /^\s*File "<string>", line (\d+)(?:, in (.+))?\s*$/;
const PY_WRAPPER_FRAME = /^\s*File "<exec>"/;

const JS_OWN_FRAME = /candidate-solution\.js:(\d+)/;
const JS_FRAME_NAME = /^\s*(?:at\s+)?([^\s@(]+)\s*(?:@|\()/;
const JS_TOP_LEVEL_NAMES = new Set(["eval", "anonymous", "<anonymous>", "Object.eval"]);

const TOP_LEVEL_NAMES = new Set(["<module>"]);

function frameLine(line: number, name: string | undefined, topLevel: Set<string>): string {
  if (!name) return `Line ${line}`;
  return topLevel.has(name) ? `Line ${line}, at the top level` : `Line ${line}, in ${name}`;
}

export function cleanPythonTraceback(stderr: string): string {
  const start = stderr.lastIndexOf(PY_HEADER);
  if (start === -1) return stderr.trimEnd();

  const before = stderr.slice(0, start);
  const kept = stderr
    .slice(start + PY_HEADER.length)
    .split("\n")
    .filter((line) => !PY_WRAPPER_FRAME.test(line))
    .map((line) => {
      const own = PY_OWN_FRAME.exec(line);
      return own ? frameLine(Number(own[1]), own[2], TOP_LEVEL_NAMES) : line;
    });
  return (before + kept.join("\n").replace(/^\n+/, "")).trimEnd();
}

// `lineOffset` is how many lines the worker's Function wrapper puts above
// the candidate's first line. It differs by browser, so the worker measures
// it rather than this assuming one.
export function cleanJsStack(name: string, message: string, stack: string, lineOffset: number): string {
  const frames = stack
    .split("\n")
    .map((line) => {
      const own = JS_OWN_FRAME.exec(line);
      if (!own) return null;
      const fn = JS_FRAME_NAME.exec(line)?.[1];
      return frameLine(Number(own[1]) - lineOffset, fn ?? "anonymous", JS_TOP_LEVEL_NAMES);
    })
    .filter((line): line is string => line !== null)
    .reverse();
  return [...frames, `${name}: ${message}`].join("\n");
}

export interface ErrorSummary {
  headline: string;
  // 1-based line of the candidate's own code, when the error names one.
  line: number | null;
}

export function summarizeError(cleaned: string): ErrorSummary | null {
  const lines = cleaned.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) return null;
  const frames = lines.map((line) => /^Line (\d+)/.exec(line)).filter((m) => m !== null);
  const last = frames[frames.length - 1];
  return { headline: lines[lines.length - 1].trim(), line: last ? Number(last[1]) : null };
}
