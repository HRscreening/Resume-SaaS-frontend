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

async function publicRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
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
