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
  /** True when the candidate's audio will be recorded. */
  recorded?: boolean;
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
// for the binding shape of these endpoints. Field names here are not ours
// to rename: the backend is built against the same document.

// The languages the harness has a driver for (backend harness.py). The
// editor offers exactly these.
export type InterviewLanguage = "python" | "javascript";

// One worked case: the function's arguments, one JSON value per line, and
// the value it returns (as JSON). On a question published before the
// harness, a program's stdin and its expected stdout.
export interface InterviewExample {
  input: string;
  output: string;
  note?: string;
}

export interface FunctionParam {
  name: string;
  type: string;
}

// The function the candidate implements (backend FunctionSignature).
export interface FunctionSignature {
  name: string;
  params: FunctionParam[];
  returns: string;
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
export interface CodingInterviewQuestion {
  id: string;
  kind: "coding";
  allocated_minutes: number;
  presented: boolean;
  title: string;
  statement_md: string;
  examples: InterviewExample[];
  // The function the candidate implements, with what the server generated
  // from it (backend harness.py): the stub the editor opens with and the
  // driver Run appends before executing, both keyed by language id. All
  // three are absent on a question published before the harness existed,
  // which runs as a plain program.
  signature?: FunctionSignature;
  starter_code?: Record<string, string>;
  harness?: Record<string, string>;
}

export type InterviewQuestion =
  | { id: string; kind: "spoken"; allocated_minutes: number; presented: boolean; prompt?: string }
  | CodingInterviewQuestion;

export interface InterviewQuestionsResponse {
  questions: InterviewQuestion[];
}

export const getInterviewQuestions = (token: string) =>
  publicRequest<InterviewQuestionsResponse>(
    `/api/v1/interview/${encodeURIComponent(token)}/questions`,
  );

// Run has no endpoint: it executes in the candidate's browser
// (src/routes/interview/execution/runCodeLocally.ts) on the same composed
// program Submit judges on the sandbox.

export interface SubmitCodeRequest {
  question_id: string;
  language: InterviewLanguage;
  source: string;
  // False when a question's timer ran out and this is the automatic save:
  // the work is captured at once and checked after the interview, so a
  // candidate who is out of time does not also wait on a sandbox.
  judge?: boolean;
}

// How the submitted code did against the question's hidden checks. Counts
// only, by design: the server never sends an input, an expected value or
// anything the program printed, so nothing here can reveal a hidden check.
export interface SubmitVerdict {
  passed: number;
  total: number;
  by_category: Record<string, { passed: number; total: number }>;
  // The candidate's own compiler output, when their code did not compile.
  compile_error?: string | null;
}

export interface SubmitCodeResponse {
  saved: true;
  // Absent when the code was saved but not checked: a question with no
  // hidden checks, the sandbox unavailable, or `judge: false`.
  verdict?: SubmitVerdict | null;
}

export const submitCode = (token: string, body: SubmitCodeRequest) =>
  publicRequest<SubmitCodeResponse>(
    `/api/v1/interview/${encodeURIComponent(token)}/submit`,
    { method: "POST", body: JSON.stringify(body) },
  );
