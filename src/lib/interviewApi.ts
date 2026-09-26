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
};

export type InterviewJoinGrant = {
  url: string;
  token: string;
  room: string;
  session_id: string;
};

// The server answered, just not with success: a real 404 ("link not valid")
// or 409 ("already completed"). The candidate's link genuinely is what the
// message says it is — no retry helps.
export class InterviewApiError extends Error {
  readonly status: number;
  constructor(status: number, detail: string) {
    super(detail);
    this.name = "InterviewApiError";
    this.status = status;
  }
}

// The request never reached the server at all (offline, DNS failure, dropped
// connection mid-flight). This is recoverable: the candidate's link may be
// perfectly fine, so the UI must offer a retry rather than blame the link.
export class InterviewNetworkError extends Error {
  constructor() {
    super("We could not reach the server. Check your connection and try again.");
    this.name = "InterviewNetworkError";
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
    // for transport-level failures — never for a server's 4xx/5xx response.
    throw new InterviewNetworkError();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new InterviewApiError(
      res.status,
      typeof body?.detail === "string" ? body.detail : "Something went wrong.",
    );
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
