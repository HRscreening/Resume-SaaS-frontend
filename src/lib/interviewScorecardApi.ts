// Client call for the interview round's recruiter-facing scorecard view.
// Recruiter surface, sits behind AuthGuard like roundApi.ts (NOT
// interviewApi.ts, which is the candidate-facing, token-only surface with no
// account). Built on the authenticated request() helper from lib/api.ts,
// which attaches the bearer token and throws ApiError (carries `.status`)
// on a non-OK response.
//
// Endpoint shape: .superpowers/sdd/2026-09-28-interview-round-authoring/
// flow-completion-contract.md, "GET /api/v1/screenings/{screening_id}/
// interview-scorecards". Scoped server-side to the caller's own account; a
// screening belonging to another account 404s like every other
// screening-scoped endpoint, not a 403 — callers should not try to
// distinguish "not yours" from "doesn't exist".
import { request } from "@/lib/api";
import type { InterviewScorecardsResponse } from "@/types";

export async function listInterviewScorecards(
  screeningId: string,
): Promise<InterviewScorecardsResponse> {
  return request<InterviewScorecardsResponse>(
    `/api/v1/screenings/${screeningId}/interview-scorecards`,
  );
}
