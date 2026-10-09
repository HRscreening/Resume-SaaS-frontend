// Candidate-facing API. Deliberately NOT built on lib/api.ts request():
// that helper attaches a Supabase bearer token, and a candidate has no
// account. Importing getAuthHeader here would make every invite link fail
// for exactly the people it is meant for.
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type InterviewBrief = {
  role_title: string | null;
  hiring_company: string | null;
  duration_minutes: number;
  candidate_name: string | null;
  already_completed: boolean;
  // What the hiring manager set when authoring this round (see
  // RoundRequirements in the authoring screen). Purely informational here:
  // the pre-join screen tells the candidate what to expect, it does not
  // detect or enforce whether a camera or screen share actually gets
  // turned on.
  requires_camera: boolean;
  requires_screen_share: boolean;
};

export type InterviewJoinGrant = {
  url: string;
  token: string;
  room: string;
  session_id: string;
};

// The server answered, just not with success: a real 404 ("link not valid")
// or 409 ("already completed"). The candidate's link genuinely is what the
// message says it is, and no retry helps.
export class InterviewApiError extends Error {
  readonly status: number;
  constructor(status: number, detail: string) {
    super(detail);
    this.name = "InterviewApiError";
    this.status = status;
  }
}

// Something transient went wrong and the candidate's link may be perfectly
// fine, so the UI must offer a retry rather than blame the link. The two
// subclasses differ only in how far the request got; every caller that just
// needs "is this worth retrying" should test against this base.
export class InterviewRetryableError extends Error {}

// The request never reached the server at all (offline, DNS failure, dropped
// connection mid-flight).
export class InterviewNetworkError extends InterviewRetryableError {
  constructor() {
    super("We could not reach the server. Check your connection and try again.");
    this.name = "InterviewNetworkError";
  }
}

// The server answered 503: it reached us, it just could not start the
// interview right now (LiveKit unreachable, or a misconfigured deployment).
// Carries the server's own candidate-facing detail, which already says to
// wait a moment and try again.
export class InterviewUnavailableError extends InterviewRetryableError {
  constructor(detail: string) {
    super(detail);
    this.name = "InterviewUnavailableError";
  }
}

async function publicRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
  } catch {
    // fetch() itself throws (rather than resolving with a bad status) only
    // for transport-level failures, never for a server's 4xx/5xx response.
    throw new InterviewNetworkError();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail =
      typeof body?.detail === "string" ? body.detail : "Something went wrong.";
    // 503 is the backend's deliberate "try again shortly" (an infrastructure
    // failure during join), as opposed to the 404 that means the link itself
    // is dead. Anything else 5xx has no candidate-safe detail to show, so it
    // gets the generic retryable copy rather than a raw server message.
    if (res.status === 503) throw new InterviewUnavailableError(detail);
    if (res.status >= 500) {
      throw new InterviewUnavailableError(
        "We could not start your interview just now. Please wait a moment and try again.",
      );
    }
    throw new InterviewApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export const getInterviewBrief = (token: string) =>
  publicRequest<InterviewBrief>(`/api/v1/interview/${encodeURIComponent(token)}`);

export const joinInterview = (token: string) =>
  publicRequest<InterviewJoinGrant>(
    `/api/v1/interview/${encodeURIComponent(token)}/join`,
    { method: "POST" },
  );

// ─── Coding pane ────────────────────────────────────────────────────────────
// See .superpowers/sdd/2026-09-28-interview-round-authoring/coding-pane-contract.md
// for the binding shape of these three endpoints. Field names here are not
// ours to rename: the backend is built against the same document.

export type InterviewLanguage = "python" | "javascript" | "cpp";

export interface InterviewExample {
  input: string;
  output: string;
  note?: string;
}

// A spoken question's text is withheld until the interviewer has actually
// presented it out loud — see
// .superpowers/sdd/2026-09-28-interview-round-authoring/question-in-focus-contract.md.
// `presented` is sent for every question; `prompt` is sent for a spoken one
// only once `presented` is true, and is absent (never null) before that —
// reading ahead of what has been asked out loud is exactly what this field
// must never allow. Coding questions keep their existing, unconditional
// content: the pane's statement/examples were already only useful once the
// pane opens, so there was never read-ahead risk to withhold them against.
export type InterviewQuestion =
  | { id: string; kind: "spoken"; allocated_minutes: number; presented: boolean; prompt?: string }
  | {
      id: string;
      kind: "coding";
      allocated_minutes: number;
      presented: boolean;
      title: string;
      statement_md: string;
      examples: InterviewExample[];
      // Per-language starter code the editor opens with, keyed by language
      // id. Absent on any question authored before the field existed, which
      // is why the pane keeps its own generic scaffold (starterCode.ts).
      starter_code?: Record<string, string>;
    };

export interface InterviewQuestionsResponse {
  questions: InterviewQuestion[];
}

export const getInterviewQuestions = (token: string) =>
  publicRequest<InterviewQuestionsResponse>(
    `/api/v1/interview/${encodeURIComponent(token)}/questions`,
  );

export interface RunCodeRequest {
  question_id: string;
  language: InterviewLanguage;
  source: string;
}

export interface RunResultItem {
  index: number;
  passed: boolean;
  stdout: string;
  stderr: string;
  status: string;
  // Present only when `passed` is false: what the visible example expected
  // versus what the candidate's program actually printed.
  expected?: string;
  actual?: string;
}

export interface RunCodeResponse {
  results: RunResultItem[];
  // Reported once for the whole run, never per example.
  compile_error: string | null;
  ran: number;
  passed: number;
}

// Not called from the frontend any more: Run for Python and JavaScript now
// executes entirely in the candidate's browser (see
// src/routes/interview/execution/runCodeLocally.ts), and C++ has no runner
// here yet. The endpoint itself stays exactly as the backend built it —
// unused by this path today, reserved for a server-side C++ judge later —
// so this client function is kept, matching the contract, rather than
// deleted and re-added when that lands.
export const runCode = (token: string, body: RunCodeRequest) =>
  publicRequest<RunCodeResponse>(`/api/v1/interview/${encodeURIComponent(token)}/run`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export interface SubmitCodeRequest {
  question_id: string;
  language: InterviewLanguage;
  source: string;
}

export interface SubmitCodeResponse {
  saved: true;
}

export const submitCode = (token: string, body: SubmitCodeRequest) =>
  publicRequest<SubmitCodeResponse>(
    `/api/v1/interview/${encodeURIComponent(token)}/submit`,
    { method: "POST", body: JSON.stringify(body) },
  );
