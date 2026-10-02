// Runs one candidate JavaScript program against one example's stdin, inside
// a Web Worker so it can never block the main thread (the agent is speaking
// live audio while this runs — see coding-pane-contract.md / the task brief
// on why this cannot be allowed to jank the call). This file is bundled by
// Vite as a classic (IIFE) worker — see javascriptRunner.ts for how it is
// constructed and why the format matters.
//
// Isolation: javascriptRunner.ts constructs a BRAND NEW Worker (hence a
// brand new JS realm) for every single example. Nothing in this file is
// reused across examples, so there is no shared global state to accidentally
// leak between them — the simplest possible isolation guarantee.
import type { JsRunRequest, JsRunResponse } from "./messages";

// This project's tsconfig includes the "DOM" lib (for the rest of the app)
// but not "webworker" — the two declare incompatible globals (`self`,
// `postMessage`, `onmessage`, ...) and cannot both be loaded in one
// TypeScript program. Casting `self` once, locally, to exactly the shape
// this file actually uses keeps everything else in the file fully typed
// without touching the project-wide lib configuration.
const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<JsRunRequest>) => void) | null;
  postMessage: (message: JsRunResponse) => void;
};

ctx.onmessage = (event) => {
  ctx.postMessage(runOnce(event.data.source, event.data.input));
};

function runOnce(source: string, input: string): JsRunResponse {
  // No trailing-newline special case needed here: a program that never
  // reads stdin at all (the "reads no input" trace) simply never calls
  // readLine, and an empty `input` still yields an empty `lines` array
  // rather than one spurious blank line.
  const lines = input.length > 0 ? input.split(/\r\n|\r|\n/) : [];
  let lineIndex = 0;
  const stdout: string[] = [];
  const stderr: string[] = [];

  function readLine(): string {
    if (lineIndex >= lines.length) {
      throw new Error(
        "No more input available: the program tried to read past the end of stdin.",
      );
    }
    return lines[lineIndex++];
  }

  const consoleShim = {
    log: (...args: unknown[]) => stdout.push(args.map(stringifyArg).join(" ")),
    info: (...args: unknown[]) => stdout.push(args.map(stringifyArg).join(" ")),
    error: (...args: unknown[]) => stderr.push(args.map(stringifyArg).join(" ")),
    warn: (...args: unknown[]) => stderr.push(args.map(stringifyArg).join(" ")),
  };

  // Node-style stdin. The only server-side JS runtime this platform has ever
  // executed candidate code in (Judge0's "JavaScript (Node.js)" language —
  // see LANGUAGE_IDS in execution.py) is Node, so candidates reasonably
  // write Node idioms. These are deliberately minimal shims, not a Node
  // polyfill: just enough for `readFileSync(0, ...)` and the
  // `process.stdin.on('data'|'end', ...)` pattern to see the example's
  // input instead of throwing "require is not defined".
  type Listener = (...args: unknown[]) => void;
  const dataListeners: Listener[] = [];
  const endListeners: Listener[] = [];
  let stdinDispatched = false;

  const stdinShim = {
    setEncoding() {
      return stdinShim;
    },
    resume() {
      return stdinShim;
    },
    on(event: string, cb: Listener) {
      if (event === "data") dataListeners.push(cb);
      if (event === "end") endListeners.push(cb);
      return stdinShim;
    },
  };

  function dispatchStdinEventsOnce(): void {
    if (stdinDispatched) return;
    stdinDispatched = true;
    dataListeners.forEach((cb) => cb(input));
    endListeners.forEach((cb) => cb());
  }

  const processShim = {
    argv: ["node", "solution.js"],
    env: {},
    stdin: stdinShim,
    exit() {
      /* no-op: a candidate's program exiting should not tear down the worker
         mid-postMessage — the worker is terminated by javascriptRunner.ts
         right after the result is posted either way. */
    },
  };

  const fsShim = {
    readFileSync(path: unknown) {
      if (path === 0 || path === "/dev/stdin") return input;
      throw new Error(
        `readFileSync: only fd 0 or "/dev/stdin" is available in this browser runner (got ${String(path)}).`,
      );
    },
  };

  function requireShim(name: string): unknown {
    if (name === "fs") return fsShim;
    if (name === "readline") {
      // Enough of Node's readline.createInterface().on('line', cb) for the
      // common "read every line" idiom — not a general readline port.
      return {
        createInterface: () => ({
          on(event: string, cb: Listener) {
            if (event === "line") {
              lines.slice(lineIndex).forEach((line) => cb(line));
              lineIndex = lines.length;
            }
            if (event === "close") cb();
            return this;
          },
          close() {},
        }),
      };
    }
    throw new Error(`require("${name}") is not available in this browser runner.`);
  }

  try {
    // `new Function` both compiles and (via the call below) runs the
    // candidate's source. A syntax error throws synchronously from the
    // `new Function(...)` call itself, so it is caught by this same
    // try/catch as any runtime error would be.
    const run = new Function(
      "console",
      "readline",
      "require",
      "process",
      `${source}\n//# sourceURL=candidate-solution.js`,
    );
    run(consoleShim, readLine, requireShim, processShim);
    dispatchStdinEventsOnce();
    return { stdout: stdout.join("\n"), stderr: stderr.join("\n"), crashed: false };
  } catch (err) {
    stderr.push(formatError(err));
    return { stdout: stdout.join("\n"), stderr: stderr.join("\n"), crashed: true };
  }
}

function stringifyArg(arg: unknown): string {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return arg.stack ?? `${arg.name}: ${arg.message}`;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.stack ?? `${err.name}: ${err.message}`;
  return String(err);
}
