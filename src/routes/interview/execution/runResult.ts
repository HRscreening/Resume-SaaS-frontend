// What a Run in the browser reports (runCodeLocally.ts). Nothing here is
// sent anywhere: it is the candidate checking their own work.

export interface RunResultItem {
  index: number;
  passed: boolean;
  // What the program printed. For a harness question this is everything
  // except the returned value, which travels in `actual`.
  stdout: string;
  stderr: string;
  // "ok" (ran and was compared), "output" (ran, nothing to compare
  // against), "runtime_error" or "timeout".
  status: string;
  // The case's expected answer, present only when `passed` is false.
  expected?: string;
  // The returned value as JSON for a harness question (also on a bare run,
  // so the candidate can see it); the program's output for a legacy one,
  // only when `passed` is false.
  actual?: string;
}

export interface RunResult {
  results: RunResultItem[];
  // Reported once for the whole run, never per example.
  compile_error: string | null;
  ran: number;
  passed: number;
}
