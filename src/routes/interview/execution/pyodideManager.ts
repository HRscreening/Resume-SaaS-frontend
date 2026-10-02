import PyodideWorker from "./pyodide.worker.ts?worker";
import type { PyMainMessage, PyWorkerMessage } from "./messages";

export type PyodideStatus = "idle" | "loading" | "ready" | "error";

// Generous: Pyodide's WASM interpreter is slower than native CPython, and a
// correct-but-slow solution a candidate is still debugging should not be
// mistaken for a hang. Still short enough that a genuine infinite loop does
// not leave the candidate staring at "Running" for long.
const PY_TIMEOUT_MS = 8000;

type StatusListener = (status: PyodideStatus) => void;
type PendingRun = { resolve: (outcome: { stdout: string; stderr: string; crashed: boolean }) => void };
type RunOutcome = { stdout: string; stderr: string; crashed: boolean; timedOut: boolean };

// A single, module-level instance (not a class a component owns): Pyodide's
// load cost must be paid exactly once for the whole interview, independent
// of which component happens to be mounted when the candidate first reaches
// a coding question. usePyodideStatus.ts is the thin React-facing wrapper
// around this.
class PyodideManager {
  private worker: Worker | null = null;
  private status: PyodideStatus = "idle";
  private errorMessage: string | null = null;
  private readonly listeners = new Set<StatusListener>();
  private readonly pending = new Map<number, PendingRun>();
  private nextRunId = 1;
  // There is exactly one Python interpreter (inside the one persistent
  // worker), so two runs cannot actually execute at once no matter how fast
  // Run is pressed — the UI already disables the button while isRunning is
  // true, but this queue makes that true structurally rather than relying
  // only on the UI to never let two calls through. Each call is chained
  // after the previous one settles, and the worker/ready-state it uses is
  // re-read at the moment it actually runs (not when it was queued), so a
  // timeout-triggered respawn in between is picked up correctly instead of
  // posting to an already-terminated worker.
  private queue: Promise<unknown> = Promise.resolve();

  getStatus(): PyodideStatus {
    return this.status;
  }

  getErrorMessage(): string | null {
    return this.errorMessage;
  }

  subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Called once, as soon as the interview starts (see usePyodideStatus.ts's
  // mount effect), never on first Run press — Pyodide is several megabytes,
  // and a candidate watching a progress bar during a live interview is time
  // taken from answering. Idempotent: safe to call from multiple mounts.
  preload(): void {
    if (this.worker || this.status === "loading" || this.status === "ready") return;
    this.spawn();
  }

  // Runs one example's worth of source+stdin. Never rejects on a timeout —
  // it resolves with `timedOut: true` — because a runaway submission is an
  // expected, handled outcome, not a bug in this harness. Rejects up front,
  // synchronously, only when Python plainly is not ready — the normal path
  // for "Run pressed while Pyodide is still loading" is actually blocked one
  // layer up (runCodeLocally checks status before ever calling this), so
  // reaching this rejection means that check raced with a timeout-triggered
  // respawn between the two calls.
  run(source: string, input: string): Promise<RunOutcome> {
    if (this.status !== "ready" || !this.worker) {
      return Promise.reject(new Error("Python is not ready yet."));
    }
    const runPromise = this.queue.then(() => this.runQueued(source, input));
    // The queue must keep moving even if a run rejects (it should not, since
    // runQueued resolves in every case below) or the next queued run would
    // wait forever.
    this.queue = runPromise.catch(() => undefined);
    return runPromise;
  }

  private runQueued(source: string, input: string): Promise<RunOutcome> {
    // Re-read `this.worker` now, at the moment this run actually starts,
    // rather than using whatever was current when `run()` was called: a
    // prior queued run's timeout may have terminated and respawned the
    // worker in the meantime.
    if (this.status !== "ready" || !this.worker) {
      return Promise.resolve({
        stdout: "",
        stderr: "Python is not ready yet.",
        crashed: true,
        timedOut: false,
      });
    }
    const worker = this.worker;
    const id = this.nextRunId++;

    return new Promise((resolve) => {
      let settled = false;

      // Python/WASM cannot be interrupted from the outside mid-loop the way
      // a native debugger could — there is no signal to send into a tight
      // `while True: pass`. Terminating the worker is the only lever
      // available, which is also why this is the one case that pays
      // Pyodide's load cost again: the terminated worker is gone, so the
      // next run needs a freshly spawned (and freshly loaded) one.
      const timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        this.pending.delete(id);
        worker.terminate();
        if (this.worker === worker) this.worker = null;
        this.spawn();
        resolve({ stdout: "", stderr: "", crashed: false, timedOut: true });
      }, PY_TIMEOUT_MS);

      this.pending.set(id, {
        resolve: (outcome) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          resolve({ ...outcome, timedOut: false });
        },
      });

      const message: PyMainMessage = { type: "run", id, source, input };
      worker.postMessage(message);
    });
  }

  private spawn(): void {
    this.setStatus("loading");
    this.errorMessage = null;
    const worker = new PyodideWorker();
    this.worker = worker;

    worker.onmessage = (event: MessageEvent<PyWorkerMessage>) => this.handleMessage(event.data);
    worker.onerror = (event) => {
      this.errorMessage = event.message || "Could not load Python in this browser.";
      this.setStatus("error");
    };

    const initMessage: PyMainMessage = { type: "init" };
    worker.postMessage(initMessage);
  }

  private handleMessage(message: PyWorkerMessage): void {
    if (message.type === "ready") {
      this.setStatus("ready");
      return;
    }
    if (message.type === "init-error") {
      this.errorMessage = message.message;
      this.setStatus("error");
      return;
    }
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    pending.resolve({ stdout: message.stdout, stderr: message.stderr, crashed: message.crashed });
  }

  private setStatus(status: PyodideStatus): void {
    this.status = status;
    this.listeners.forEach((listener) => listener(status));
  }
}

export const pyodideManager = new PyodideManager();
