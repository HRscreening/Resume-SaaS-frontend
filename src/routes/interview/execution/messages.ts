// Message shapes for the two execution workers (javascript.worker.ts,
// pyodide.worker.ts). Kept as plain `type`/`interface` declarations with no
// runtime code so they can be `import type`-ed from a worker file without
// pulling anything into that worker's bundle (type-only imports are erased
// at compile time regardless of whether Vite bundles a given worker as a
// classic or a module script — see pyodide.worker.ts's own comment on why
// that distinction matters there).

// ─── JavaScript worker ──────────────────────────────────────────────────────
// One request/response per call: the orchestrator (javascriptRunner.ts)
// spins up a fresh worker per example, so there is no id to correlate — the
// only message either side ever sends is "the" request or "the" response.

export interface JsRunRequest {
  source: string;
  input: string;
}

export interface JsRunResponse {
  stdout: string;
  stderr: string;
  // True when the candidate's program raised past the top level (a thrown
  // error, a syntax error, reading past the end of stdin). Mirrors the
  // backend's Judge0-status split in execution.py: `passed` is computed from
  // stdout ONLY when the run completed without crashing, exactly like
  // Judge0's `_STATUS_ACCEPTED` gate on `outputs_match`.
  crashed: boolean;
}

// ─── Pyodide worker ─────────────────────────────────────────────────────────
// Long-lived worker, reused across many runs (see pyodideManager.ts for why),
// so messages need an `id` to match a "run" request to its "result".

export type PyMainMessage =
  | { type: "init" }
  | { type: "run"; id: number; source: string; input: string };

export type PyWorkerMessage =
  | { type: "ready" }
  | { type: "init-error"; message: string }
  | { type: "result"; id: number; stdout: string; stderr: string; crashed: boolean };
