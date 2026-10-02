import JavaScriptWorker from "./javascript.worker.ts?worker";
import type { JsRunRequest, JsRunResponse } from "./messages";

// Generous for real interview code, short enough that a candidate's
// `while (true) {}` does not hold up the Run button for long. JS has no
// equivalent of Python's WASM-recompile cost, so this can stay tight.
const JS_TIMEOUT_MS = 5000;

export interface JsRunOutcome {
  stdout: string;
  stderr: string;
  crashed: boolean;
  timedOut: boolean;
}

// A fresh Worker — and therefore a fresh JS realm — for every single
// example. This is "each example runs clean" solved the simplest possible
// way: there is no state to leak between examples because nothing is ever
// shared between their workers. JS has no multi-megabyte runtime to load
// (unlike Pyodide), so unlike Python there is no preloading tradeoff that
// would push toward reusing one worker — a fresh one per call is free.
export function runJavaScriptExample(source: string, input: string): Promise<JsRunOutcome> {
  return new Promise((resolve) => {
    const worker = new JavaScriptWorker();
    let settled = false;

    function finish(outcome: JsRunOutcome) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      worker.terminate();
      resolve(outcome);
    }

    // The only way to stop `while (true) {}`: JS is single-threaded, so a
    // tight synchronous loop blocks this worker forever and it will never
    // post a result back. Terminating the worker from the outside is the
    // one thing that still works.
    const timer = window.setTimeout(() => {
      finish({ stdout: "", stderr: "", crashed: false, timedOut: true });
    }, JS_TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent<JsRunResponse>) => {
      finish({ ...event.data, timedOut: false });
    };

    // Fires only for a bug in this harness itself (javascript.worker.ts's
    // own top-level code failing to load, for instance) — candidate code
    // errors are already caught inside the worker and arrive as a normal
    // onmessage with crashed: true, never as this event.
    worker.onerror = (event) => {
      finish({
        stdout: "",
        stderr: event.message || "The code runner crashed unexpectedly.",
        crashed: true,
        timedOut: false,
      });
    };

    const request: JsRunRequest = { source, input };
    worker.postMessage(request);
  });
}
