// Runs candidate Python inside a persistent Web Worker, via Pyodide (CPython
// compiled to WebAssembly). Persistent — unlike javascript.worker.ts, which
// is spun up fresh per example — because Pyodide's runtime is several
// megabytes and costs real time to fetch and instantiate; pyodideManager.ts
// preloads exactly one of these the moment the interview starts specifically
// so that cost is paid once, long before a coding question appears, not
// once per Run press.
//
// Pinned CDN version — never "latest". See PYODIDE_VERSION below.
//
// This file is bundled by Vite as a classic (IIFE) worker (Vite's default
// `worker.format`), not a module worker, which is what makes the
// `importScripts` call below legal: that API only exists on classic workers.
// Static `import type` of message shapes is still fine here — type-only
// imports are erased at compile time, so they add nothing to the bundle and
// do not turn this into a module worker.
import type { PyMainMessage, PyWorkerMessage } from "./messages";

// Pyodide's own CDN, pinned to one exact release. A silent upgrade mid
// hiring-season (a new Pyodide release changing stdlib behaviour, or going
// fully offline) is not something anyone should discover from a candidate's
// bug report, so this must be a specific version, bumped deliberately.
const PYODIDE_VERSION = "0.27.8";
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

// See javascript.worker.ts's identical comment: this project's tsconfig
// loads the "DOM" lib for the rest of the app, not "webworker" (the two
// declare clashing globals), so `self` is cast once, locally, to exactly
// what this file needs plus the one extra worker-only API (`importScripts`)
// DOM does not declare.
const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<PyMainMessage>) => void) | null;
  postMessage: (message: PyWorkerMessage) => void;
  importScripts: (...urls: string[]) => void;
  loadPyodide?: (options: { indexURL: string }) => Promise<PyodideInterface>;
};

// Deliberately loose: the full Pyodide API surface ships as its own `pyodide`
// npm package's types, which this project does not install (Pyodide is
// fetched from the CDN at runtime, not bundled — see the version-pinning
// comment above for why). This interface only names the handful of calls
// this file actually makes.
interface PyodideInterface {
  globals: {
    get(name: string): { (): PyProxyDict };
  };
  runPythonAsync(code: string, options: { globals: PyProxyDict }): Promise<unknown>;
}
interface PyProxyDict {
  set(key: string, value: unknown): void;
  get(key: string): unknown;
  destroy(): void;
}

let pyodide: PyodideInterface | null = null;
let initPromise: Promise<void> | null = null;

// Everything a run needs beyond `exec` itself: stdin wired to the example's
// input (mirroring real Python `input()`/`sys.stdin` behaviour, including
// raising EOFError on exhaustion exactly like CPython does), stdout/stderr
// captured instead of going nowhere, and the candidate's own traceback
// preserved on failure rather than swallowed. `__INPUT_TEXT__` and
// `__USER_SOURCE__` are injected as real Python values via the globals
// PyProxy's `.set()` (see runOnce below), never interpolated into this
// string — candidate source can contain anything (quotes, backslashes,
// triple-quotes) without any escaping concern.
const WRAPPER_SCRIPT = `
import sys, io, contextlib, traceback, builtins

class _BrowserStdin:
    def __init__(self, text):
        self._lines = text.splitlines(True)
        self._i = 0
    def readline(self, *a, **k):
        if self._i >= len(self._lines):
            return ""
        line = self._lines[self._i]
        self._i += 1
        return line
    def read(self, *a, **k):
        rest = "".join(self._lines[self._i:])
        self._i = len(self._lines)
        return rest
    def readlines(self, *a, **k):
        out = self._lines[self._i:]
        self._i = len(self._lines)
        return out
    def __iter__(self):
        return self
    def __next__(self):
        line = self.readline()
        if line == "":
            raise StopIteration
        return line

sys.stdin = _BrowserStdin(__INPUT_TEXT__)

def _input(prompt=""):
    line = sys.stdin.readline()
    if line == "":
        raise EOFError("EOF when reading a line")
    return line[:-1] if line.endswith("\\n") else line

builtins.input = _input

__out__ = io.StringIO()
__err__ = io.StringIO()
try:
    with contextlib.redirect_stdout(__out__), contextlib.redirect_stderr(__err__):
        exec(__USER_SOURCE__)
    __CRASHED__ = False
except BaseException:
    __err__.write(traceback.format_exc())
    __CRASHED__ = True

__RESULT_STDOUT__ = __out__.getvalue()
__RESULT_STDERR__ = __err__.getvalue()
`;

async function init(): Promise<void> {
  ctx.importScripts(`${PYODIDE_INDEX_URL}pyodide.js`);
  const loadPyodide = ctx.loadPyodide;
  if (!loadPyodide) {
    throw new Error("Pyodide failed to load from the CDN.");
  }
  pyodide = await loadPyodide({ indexURL: PYODIDE_INDEX_URL });
}

async function runOnce(
  source: string,
  input: string,
): Promise<{ stdout: string; stderr: string; crashed: boolean }> {
  if (!pyodide) throw new Error("Python is not loaded yet.");
  // A fresh globals dict per run — the documented Pyodide pattern for
  // isolating user code (`pyodide.globals.get("dict")()` calls Python's own
  // builtin `dict` to build a new, empty namespace). A variable, import, or
  // monkeypatch left behind by one example cannot leak into the next one's
  // run, because the next run never sees this dict again. This stops short
  // of a fresh *worker* per example on purpose: the whole point of
  // preloading is paying Pyodide's load cost once, not once per example.
  const namespace = pyodide.globals.get("dict")();
  namespace.set("__INPUT_TEXT__", input);
  namespace.set("__USER_SOURCE__", source);
  try {
    await pyodide.runPythonAsync(WRAPPER_SCRIPT, { globals: namespace });
    const stdout = (namespace.get("__RESULT_STDOUT__") as string) ?? "";
    const stderr = (namespace.get("__RESULT_STDERR__") as string) ?? "";
    const crashed = Boolean(namespace.get("__CRASHED__"));
    return { stdout, stderr, crashed };
  } finally {
    namespace.destroy();
  }
}

ctx.onmessage = (event) => {
  const message = event.data;

  if (message.type === "init") {
    initPromise =
      initPromise ??
      init().catch((err) => {
        initPromise = null;
        throw err;
      });
    initPromise
      .then(() => ctx.postMessage({ type: "ready" }))
      .catch((err: unknown) =>
        ctx.postMessage({
          type: "init-error",
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    return;
  }

  if (message.type === "run") {
    const { id, source, input } = message;
    runOnce(source, input)
      .then(({ stdout, stderr, crashed }) =>
        ctx.postMessage({ type: "result", id, stdout, stderr, crashed }),
      )
      .catch((err: unknown) =>
        ctx.postMessage({
          type: "result",
          id,
          stdout: "",
          stderr: err instanceof Error ? (err.stack ?? err.message) : String(err),
          crashed: true,
        }),
      );
  }
};
