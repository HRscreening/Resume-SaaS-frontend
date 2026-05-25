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

async function getAuthHeader(): Promise<Record<string, string>> {
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

async function request<T>(
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

export async function listScreenings(): Promise<ScreeningListItem[]> {
  return request<ScreeningListItem[]>("/api/screenings");
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
          page: String((params as { page?: number }).page ?? 1),
          page_size: String((params as { page_size?: number }).page_size ?? 20),
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

export type ResumeDetailFull = Resume & {
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

export async function exportResults(screeningId: string): Promise<Blob> {
  const authHeaders = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/screenings/${screeningId}/export`, {
    method: "POST",
    headers: authHeaders,
  });
  if (!res.ok) throw new Error("Export failed");
  return res.blob();
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
    `/api/screenings/${screeningId}/rescore`,
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
export async function saveScreeningStages(
  screeningId: string,
  stages: StagesMap,
): Promise<string> {
  return request<string>(`/api/v1/screenings/${screeningId}/save-stages`, {
    method: "POST",
    body: JSON.stringify(stages),
  });
}

// Update a single candidate's current stage. Backend contract:
// POST /api/v1/scores/:scoreId/update-stage?new_stage=<stage>. Returns a
// plain string body.
export async function updateCandidateStage(
  scoreId: string,
  stage: HiringStage,
): Promise<string> {
  const qs = new URLSearchParams({ new_stage: stage });
  return request<string>(
    `/api/v1/scores/${scoreId}/update-stage?${qs.toString()}`,
    { method: "POST" },
  );
}

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