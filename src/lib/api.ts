import { getAccessToken } from "@/lib/auth";
import { clearSessionHint } from "@/lib/sessionHint";
import { createClient } from "@/lib/supabase/client";
import { detectCurrency } from "@/lib/currency";
import type {
  Profile,
  UsageResponse,
  Rubric,
  Screening,
  ScreeningListItem,
  PaginatedResults,
  BatchProgress,
  Resume,
  Score,
  StagesMap,
  HiringStage,
  CandidateQueryState,
} from "@/types";
import { toRequestParams } from "@/components/screening/filters/queryEncoding";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function getAuthHeader(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return { Authorization: `Bearer ${token}` };
}

function parseErrorDetail(body: unknown, status: number): string {
  if (!body || typeof body !== "object") return `HTTP ${status}`;
  const b = body as Record<string, unknown>;
  const detail = b.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d: any) => (typeof d === "string" ? d : d?.msg ?? JSON.stringify(d)))
      .join("; ");
  }
  if (detail != null) return JSON.stringify(detail);
  if (typeof b.message === "string") return b.message;
  return `HTTP ${status}`;
}

export async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeaders = await getAuthHeader();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(options.headers as Record<string, string> ?? {}),
    },
  });

  if (!res.ok) {
    if (res.status === 401) clearSessionHint();
    const body = await res.json().catch(() => ({}));
    throw new Error(parseErrorDetail(body, res.status));
  }

  // 204 No Content (e.g. DELETE) has no body to parse.
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export async function requestFormData<T>(
  path: string,
  formData: FormData,
  options: Omit<RequestInit, "body"> = {}
): Promise<T> {
  const authHeaders = await getAuthHeader();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    method: options.method ?? "POST",
    body: formData,
    headers: {
      ...authHeaders,
      ...(options.headers as Record<string, string> ?? {}),
    },
  });

  if (!res.ok) {
    if (res.status === 401) clearSessionHint();
    const body = await res.json().catch(() => ({}));
    throw new Error(parseErrorDetail(body, res.status));
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<Profile> {
  return request<Profile>("/api/user/profile");
}

export async function updateProfile(
  data: Partial<Pick<Profile, "full_name" | "company_name" | "reported_role">>
): Promise<Profile> {
  return request<Profile>("/api/user/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function completeOnboarding(data: {
  full_name: string;
  company_name?: string;
  reported_role?: string;
}): Promise<Profile> {
  return request<Profile>("/api/user/onboarding", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getUsage(): Promise<UsageResponse> {
  return request<UsageResponse>("/api/user/usage");
}

export async function deleteAccount(): Promise<void> {
  return request<void>("/api/user/account", { method: "DELETE" });
}

// ─── Screenings ───────────────────────────────────────────────────────────────

export async function createJob(data: {
  title: string;
  raw_jd_text: string;
  rubric: Rubric;
}): Promise<{ screening_id: string }> {
  return request<{ screening_id: string }>("/api/screenings/jobs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function createJob_v1(
  data: FormData
): Promise<{ screening_id: string }> {
  return requestFormData("/api/v1/screenings/create-job", data);
}

function buildUploadHeaders(
  authHeaders: Record<string, string>,
  idempotencyKey: string | undefined,
): Record<string, string> {
  const headers: Record<string, string> = { ...authHeaders };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  return headers;
}

async function handleUploadResponse<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  const body = await res.json().catch(() => ({}));
  if (res.status === 409 && (body as { detail?: string })?.detail === "request_in_flight") {
    throw new Error(
      "Your previous upload is still being processed. Please wait a moment before retrying.",
    );
  }
  throw new Error(parseErrorDetail(body, res.status));
}

export async function uploadResumesToJob(
  screeningId: string,
  input: File | File[],
  idempotencyKey?: string,
): Promise<{ screening_id: string; batch_id: string; total_files: number; skipped: number }> {
  const authHeaders = await getAuthHeader();
  const formData = new FormData();
  const fileList = Array.isArray(input) ? input : [input];
  // Mirrors addResumesToJob: a single ZIP rides the zip_file field; PDFs and
  // DOCXs ride the repeated `files` field. Backend accepts both shapes on
  // /upload and /add-resumes (commit 59ca9f7).
  const isZip = fileList.length === 1 && fileList[0].name.toLowerCase().endsWith(".zip");
  if (isZip) {
    formData.append("zip_file", fileList[0]);
  } else {
    for (const f of fileList) {
      formData.append("files", f);
    }
  }

  const res = await fetch(`${API_BASE}/api/screenings/${screeningId}/upload`, {
    method: "POST",
    headers: buildUploadHeaders(authHeaders, idempotencyKey),
    body: formData,
  });
  return handleUploadResponse(res);
}

export async function addResumesToJob(
  screeningId: string,
  input: File | File[],
  idempotencyKey?: string,
): Promise<{ screening_id: string; batch_id: string; new_files: number; total_resumes: number; skipped: number }> {
  const authHeaders = await getAuthHeader();
  const formData = new FormData();
  const fileList = Array.isArray(input) ? input : [input];
  const isZip = fileList.length === 1 && fileList[0].name.toLowerCase().endsWith(".zip");
  if (isZip) {
    formData.append("zip_file", fileList[0]);
  } else {
    for (const f of fileList) {
      formData.append("files", f);
    }
  }
  const res = await fetch(`${API_BASE}/api/screenings/${screeningId}/add-resumes`, {
    method: "POST",
    headers: buildUploadHeaders(authHeaders, idempotencyKey),
    body: formData,
  });
  return handleUploadResponse(res);
}

export async function parseJDFile(file: File): Promise<{ text: string; char_count: number }> {
  const authHeaders = await getAuthHeader();
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/screenings/parse-jd-file`, {
    method: "POST",
    headers: authHeaders,
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseErrorDetail(body, res.status));
  }
  return res.json();
}

export async function analyzeJD(jdText: string): Promise<Rubric> {
  return request<Rubric>("/api/screenings/generate-rubric", {
    method: "POST",
    body: JSON.stringify({ jd_text: jdText }),
  });
}

// Quota/session metadata the JD stream returns via custom response headers.
// Each field is null when the backend didn't send it (or, cross-origin, didn't
// expose it via Access-Control-Expose-Headers).
export interface JdGenerateMeta {
  // Reprompts remaining in the current window.
  attemptsLeft: number | null;
  // Total reprompts allowed per window (for "x / y" displays).
  maxAttempts: number | null;
  // When the attempt window resets, as a Date; null if unknown.
  resetsAt: Date | null;
}

// Both the JD stream and PDF download share the same jd_session_id window and
// surface their remaining quota through the same custom response headers, so
// parse them once here. Each field is null when the backend didn't send it (or,
// cross-origin, didn't expose it via Access-Control-Expose-Headers).
function parseJdGenerateMeta(res: Response): JdGenerateMeta {
  const attemptsHeader = res.headers.get("X-Attempts-Left");
  const maxHeader = res.headers.get("X-Max-Attempts");
  const resetsHeader = res.headers.get("X-Jd-Generate-Session-Resets-At");
  const resetsDate = resetsHeader ? new Date(resetsHeader) : null;
  return {
    attemptsLeft: attemptsHeader != null ? Number(attemptsHeader) : null,
    maxAttempts: maxHeader != null ? Number(maxHeader) : null,
    // Guard against an unparseable / empty date string.
    resetsAt: resetsDate && !Number.isNaN(resetsDate.getTime()) ? resetsDate : null,
  };
}

// Structured job details the backend uses to ground JD generation. Mirrors the
// backend's JdGenerateInput. The string fields are required (non-empty);
// `yrs_experience`, `salary_compensation_info` and `skills` may be null but the
// keys must still be present. `company_url` must include an http(s):// scheme —
// callers normalize before sending (see JdAiBuilder).
export interface JdGenerateInput {
  job_title: string;
  company_name: string;
  company_url: string;
  employment_type: string;
  work_arrangement:string
  location: string;
  yrs_experience: string | null;
  salary_compensation_info: string | null;
  department: string | null;
  skills: string | null;
}

// Generate (or refine) a job description with AI, streamed token-by-token.
// `jd_details` carries the structured fields the backend grounds on; pass the
// current JD back as `current_Jd` to reprompt an existing draft (send "" for the
// first pass). `onChunk` fires with the full accumulated text so far (not the
// delta) so callers can bind it straight to a textarea.
//
// Returns quota/session metadata from the response headers (see JdGenerateMeta).
// `credentials: "include"` is required so the backend's jd_session_id cookie is
// sent back on reprompts, keeping the attempt window consistent across requests.
//
// Note: `current_Jd` casing is intentional — it matches the backend contract.
export async function generateJDStream(
  body: { jd_details: JdGenerateInput; user_input: string; current_Jd: string },
  onChunk: (fullText: string) => void,
): Promise<JdGenerateMeta> {
  const authHeaders = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/v1/screenings/generate-jd/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(body),
    credentials: "include",
  });

  if (!res.ok || !res.body) {
    if (res.status === 401) clearSessionHint();
    const errBody = await res.json().catch(() => ({}));
    throw new Error(parseErrorDetail(errBody, res.status));
  }

  const meta = parseJdGenerateMeta(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onChunk(text);
  }
  // Flush any trailing multi-byte character left in the decoder.
  text += decoder.decode();
  onChunk(text);

  return meta;
}

// Render the current job description as a downloadable PDF. Takes the same
// payload shape as generateJDStream (jd_details + user_input + current_Jd) so
// the backend grounds the document on whatever the user currently has. Returns
// the file blob plus the server-suggested filename (parsed from
// Content-Disposition; null when absent or unexposed cross-origin, so callers
// fall back).
//
// Downloads are rate-limited: a 429 carries a human-readable message in the
// response body (detail/message). parseErrorDetail surfaces that exact text via
// the thrown Error so the UI can show the backend's limit message rather than a
// generic one. `credentials: "include"` mirrors the stream so the download
// shares the same jd_session_id window.
//
// The download shares that window with generateJDStream and returns the same
// quota headers, so `meta` is parsed and returned too — callers update the same
// attempts/resets display they drive off the stream's meta.
export async function downloadJDPdf(
  body: { jd_details: JdGenerateInput; user_input: string; current_Jd: string },
): Promise<{ blob: Blob; filename: string | null; meta: JdGenerateMeta }> {
  const authHeaders = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/v1/screenings/download-generate-jd`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) clearSessionHint();
    const errBody = await res.json().catch(() => ({}));
    throw new Error(parseErrorDetail(errBody, res.status));
  }
  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  const filename = match ? decodeURIComponent(match[1].trim()) : null;
  return { blob: await res.blob(), filename, meta: parseJdGenerateMeta(res) };
}

export async function listScreenings(): Promise<ScreeningListItem[]> {
  return request<ScreeningListItem[]>("/api/v1/screenings");
}

export async function getScreening(id: string): Promise<Screening> {
  return request<Screening>(`/api/screenings/${id}`);
}

// New paginated results endpoint. Backend no longer returns per-criterion
// breakdowns in the list payload — instead each candidate carries pre-aggregated
// `category_scores`. Detailed criterion data is fetched on demand via
// getResumeDetail when the analysis sheet opens.
// Accepts either a full CandidateQueryState (preferred) or a plain
// { page, page_size } object for callers that don't filter/sort. Unknown
// params on the backend are tolerated by FastAPI, so it is safe to send
// filter/sort keys ahead of the backend honoring them.
export async function getResults(
  screeningId: string,
  params: CandidateQueryState | { page?: number; page_size?: number } = {},
): Promise<PaginatedResults> {
  const qs =
    "search" in params || "stage" in params || "sort" in params
      ? toRequestParams(params as CandidateQueryState)
      : new URLSearchParams({
          cursor: String((params as { cursor?: number }).cursor ?? ""),
          limit: String((params as { limit?: number }).limit ?? 10),
        });
  return request<PaginatedResults>(`/api/v1/screenings/${screeningId}/results?${qs.toString()}`);
}

export async function getResumeDetail(
  screeningId: string,
  resumeId: string
): Promise<Resume & { score: Score | null }> {
  return request<Resume & { score: Score | null }>(
    `/api/screenings/${screeningId}/results/${resumeId}`
  );
}

import {Application} from "@/modules/screening/types/application.type"
export type ResumeDetailFull = Resume & {
  profile : Application | null;
  score: Score | null;
  parsed_text: string | null;
  parsed_data: Record<string, unknown> | null;
  page_count: number | null;
  char_count: number | null;
  pdf_url: string | null;
  pdf_filename: string | null;
};

// /full returns { detail: Resume + score + parsed_*, pdf_url, pdf_filename }.
// Flattened here so callers consume a single object and avoid a second
// pdf-url round-trip.
export async function getResumeDetailFull(
  screeningId: string,
  resumeId: string
): Promise<ResumeDetailFull> {
  const res = await request<{
    detail: Resume & {
      profile: Application | null;
      score: Score | null;
      parsed_text: string | null;
      parsed_data: Record<string, unknown> | null;
      page_count: number | null;
      char_count: number | null;
    };
    pdf_url: string | null;
    pdf_filename: string | null;
  }>(`/api/screenings/${screeningId}/results/${resumeId}/full`);

  return {
    ...res.detail,
    profile:res.detail.profile ?? null,
    pdf_url: res.pdf_url,
    pdf_filename: res.pdf_filename,
  };
}

export async function getResumePdfUrl(
  screeningId: string,
  resumeId: string
): Promise<{ url: string; filename: string }> {
  return request<{ url: string; filename: string }>(
    `/api/screenings/${screeningId}/results/${resumeId}/pdf-url`
  );
}

/**
 * Combined resume detail + signed PDF URL in a single round-trip. Used by
 * the resume-detail route loader to avoid the dependent-fetch waterfall the
 * component would otherwise create (detail → screening → pdf-url).
 */
export async function getResumeFull(
  screeningId: string,
  resumeId: string
): Promise<{
  detail: Resume & { score: Score | null };
  pdf_url: string | null;
  pdf_filename: string | null;
}> {
  return request<{
    detail: Resume & { score: Score | null };
    pdf_url: string | null;
    pdf_filename: string | null;
  }>(`/api/screenings/${screeningId}/results/${resumeId}/full`);
}

export async function getBatchProgress(screeningId: string): Promise<BatchProgress> {
  return request<BatchProgress>(`/api/screenings/${screeningId}/batch-progress`);
}

// Export the screening results as an Excel (.xlsx) file. Accepts the same
// filter/sort state as getResults so the spreadsheet matches exactly what the
// user sees in the candidate table. page/page_size are stripped — export spans
// the full filtered set, not a single page. Returns the binary blob plus the
// server-suggested filename (from Content-Disposition; null when absent or
// unexposed cross-origin, so callers fall back).
export async function exportResults(
  screeningId: string,
  params: CandidateQueryState | { page?: number; page_size?: number } = {},
): Promise<{ blob: Blob; filename: string | null }> {
  const qs =
    "search" in params || "stage" in params || "sort" in params
      ? toRequestParams(params as CandidateQueryState)
      : new URLSearchParams();
  qs.delete("page");
  qs.delete("page_size");
  const query = qs.toString();

  const authHeaders = await getAuthHeader();
  const res = await fetch(
    `${API_BASE}/api/v1/screenings/${screeningId}/export${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: authHeaders,
    },
  );
  if (!res.ok) {
    if (res.status === 401) clearSessionHint();
    throw new Error("Export failed");
  }
  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  const filename = match ? decodeURIComponent(match[1].trim()) : null;
  return { blob: await res.blob(), filename };
}

// Download a single candidate's scorecard. Returns the file blob plus the
// server-suggested filename (parsed from Content-Disposition; null when the
// header is absent or unexposed cross-origin, so callers fall back).
export async function downloadScorecard(
  scoreId: string,
): Promise<{ blob: Blob; filename: string | null }> {
  const authHeaders = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/v1/scores/${scoreId}/download-scorecard`, {
    method: "GET",
    headers: authHeaders,
  });
  if (!res.ok) {
    if (res.status === 401) clearSessionHint();
    throw new Error("Failed to download scorecard");
  }
  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  const filename = match ? decodeURIComponent(match[1].trim()) : null;
  return { blob: await res.blob(), filename };
}

export async function deleteScreening(id: string): Promise<void> {
  return request<void>(`/api/screenings/${id}`, { method: "DELETE" });
}

// Update a screening's rubric. Backend endpoint TBD — assumes PATCH /rubric
// accepting the same shape as createJob.rubric. Does not trigger rescoring on
// its own; pair with rescoreScreening() below.
export async function updateRubric(
  screeningId: string,
  rubric: Rubric,
): Promise<Screening> {
  return request<Screening>(`/api/screenings/${screeningId}/rubric`, {
    method: "PATCH",
    body: JSON.stringify({ rubric }),
  });
}

// Re-score resumes in the screening against the current rubric.
// Backend endpoint TBD — assumes POST /rescore which kicks off a new batch
// and returns the new batch_id. The UI then polls batch-progress as usual.
// Pass `resume_ids` to rescore a subset; omit/empty to rescore all.
export async function rescoreScreening(
  screeningId: string,
  body?: { resume_ids?: string[] },
): Promise<{ screening_id: string; batch_id: string; total_resumes: number }> {
  return request<{ screening_id: string; batch_id: string; total_resumes: number }>(
    `/api/v1/scores/${screeningId}/rescore`,
    {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    },
  );
}

// Persist the full stages configuration for a screening. Backend contract:
// POST /api/screenings/:id/save-stages with the StagesMap as the raw body
// (not wrapped). Always send the complete current map — the endpoint
// replaces, not merges.

// ─── Billing ─────────────────────────────────────────────────────────────────

export async function getPlans(): Promise<import("@/types").PlanSpec[]> {
  const res = await request<{ plans: import("@/types").PlanSpec[] }>("/api/billing/plans");
  return res.plans;
}

export interface FxRate {
  base: string;
  currency: string;
  rate: number;
  fallback: boolean;
}

export async function getFxRate(): Promise<FxRate> {
  const currency = detectCurrency();
  console.log(`Creating Razorpay order with currency: ${currency}`);
  return request<FxRate>(`/api/billing/fx-rate?currency=${encodeURIComponent(currency)}`);
}


export async function createRazorpayOrder({plan,cycle}:{
  plan: string;
  cycle: "monthly" | "yearly"
}): Promise<{
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}> {
  const currency = detectCurrency();
  console.log(`Creating Razorpay order with currency: ${currency}`);
  return request(
    `/api/billing/razorpay/order?plan=${plan}&cycle=${cycle}&currency=${encodeURIComponent(currency)}`,
    { method: "POST" },
  );
}

export async function verifyRazorpayPayment(data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  plan: string;
}): Promise<{ success: boolean; plan: string }> {
  return request("/api/billing/razorpay/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function cancelSubscription(): Promise<{
  success: boolean;
  plan: string;
  previous_plan?: string;
  already_free?: boolean;
}> {
  return request("/api/billing/cancel", { method: "POST" });
}




export async function sumbitContactUsForm(
  data: { company_name: string; query: string },
  isEnterprise: boolean,
): Promise<void> {
  return request(`/api/contact/authenticated?isEnterprise=${isEnterprise}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
// ─── Voice Screening Round ─────────────────────────────────────────────────

export async function generateQuestionPlan(
  screeningId: string,
): Promise<import("@/types").GenerateQuestionPlanResponse> {
  return request(`/api/v1/screenings/${screeningId}/voice/question-plan/generate`, {
    method: "POST",
  });
}

export async function getVoiceConfig(
  screeningId: string,
): Promise<import("@/types").VoiceConfigResponse> {
  return request(`/api/v1/screenings/${screeningId}/voice/config`);
}

export async function saveVoiceConfig(
  screeningId: string,
  config: import("@/types").VoiceConfig,
): Promise<import("@/types").VoiceConfigResponse> {
  return request(`/api/v1/screenings/${screeningId}/voice/config`, {
    method: "PUT",
    body: JSON.stringify(config),
  });
}

// ─── Voice calls + scorecards (Phase 2) ────────────────────────────────────

export async function triggerVoiceCalls(
  screeningId: string,
  resumeIds?: string[],
  scheduledAt?: string | null,
  // TEMPORARY (2026-07-13): dial a UI-entered number for a single candidate.
  phoneOverride?: string | null,
): Promise<import("@/types").TriggerCallsResponse> {
  return request(`/api/v1/screenings/${screeningId}/voice/calls`, {
    method: "POST",
    body: JSON.stringify({
      resume_ids: resumeIds ?? null,
      scheduled_at: scheduledAt ?? null,
      phone_override: phoneOverride ?? null,
    }),
  });
}

export async function cancelScheduledCall(
  screeningId: string,
  callId: string,
): Promise<void> {
  await request(`/api/v1/screenings/${screeningId}/voice/calls/${callId}`, {
    method: "DELETE",
  });
}

export async function listVoiceCalls(
  screeningId: string,
): Promise<import("@/types").CallsListResponse> {
  return request(`/api/v1/screenings/${screeningId}/voice/calls`);
}

export async function listCallCandidates(
  screeningId: string,
): Promise<import("@/types").CallCandidatesResponse> {
  return request(`/api/v1/screenings/${screeningId}/voice/candidates`);
}

export async function getCallScorecard(
  screeningId: string,
  callId: string,
): Promise<import("@/types").CallScorecardDetail> {
  return request(`/api/v1/screenings/${screeningId}/voice/calls/${callId}/scorecard`);
}

export async function overrideCallScorecard(
  screeningId: string,
  callId: string,
  body: import("@/types").ScorecardOverrideRequest,
): Promise<import("@/types").CallScorecardDetail> {
  return request(`/api/v1/screenings/${screeningId}/voice/calls/${callId}/scorecard/override`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function getCallArtifacts(
  screeningId: string,
  callId: string,
): Promise<import("@/types").CallArtifactsResponse> {
  return request(`/api/v1/screenings/${screeningId}/voice/calls/${callId}/artifacts`);
}
