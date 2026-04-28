import { getAccessToken } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import type {
  Profile,
  UsageResponse,
  Rubric,
  Screening,
  ScreeningListItem,
  RankedCandidate,
  BatchProgress,
  Resume,
  Score,
} from "@/types";

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

export interface TokenUsageEntry {
  stage: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  screening_id: string | null;
  resume_id: string | null;
  created_at: string;
}

export interface TokenUsageResponse {
  total_calls: number;
  total_tokens: number;
  total_cost_usd: number;
  by_stage: Record<string, { calls: number; input_tokens: number; output_tokens: number; total_tokens: number; cost_usd: number }>;
  entries: TokenUsageEntry[];
}

export async function getTokenUsage(): Promise<TokenUsageResponse> {
  return request<TokenUsageResponse>("/api/user/token-usage");
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

export async function uploadResumesToJob(
  screeningId: string,
  zipFile: File
): Promise<{ screening_id: string; batch_id: string; total_files: number; skipped: number }> {
  const authHeaders = await getAuthHeader();
  const formData = new FormData();
  formData.append("zip_file", zipFile);

  const res = await fetch(`${API_BASE}/api/screenings/${screeningId}/upload`, {
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

export async function addResumesToJob(
  screeningId: string,
  file: File,
): Promise<{ screening_id: string; batch_id: string; new_files: number; total_resumes: number; skipped: number }> {
  const authHeaders = await getAuthHeader();
  const formData = new FormData();
  if (file.name.toLowerCase().endsWith(".zip")) {
    formData.append("zip_file", file);
  } else {
    formData.append("file", file);
  }
  const res = await fetch(`${API_BASE}/api/screenings/${screeningId}/add-resumes`, {
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

export async function getResults(screeningId: string): Promise<RankedCandidate[]> {
  return request<RankedCandidate[]>(`/api/screenings/${screeningId}/results`);
}

export async function getResumeDetail(
  screeningId: string,
  resumeId: string
): Promise<Resume & { score: Score | null }> {
  return request<Resume & { score: Score | null }>(
    `/api/screenings/${screeningId}/results/${resumeId}`
  );
}

export async function getResumePdfUrl(
  screeningId: string,
  resumeId: string
): Promise<{ url: string; filename: string }> {
  return request<{ url: string; filename: string }>(
    `/api/screenings/${screeningId}/results/${resumeId}/pdf-url`
  );
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

// ─── Billing ─────────────────────────────────────────────────────────────────

export async function createCheckoutSession(plan: string): Promise<{ url: string }> {
  return request<{ url: string }>("/api/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
}

export async function createPortalSession(): Promise<{ url: string }> {
  return request<{ url: string }>("/api/billing/portal", { method: "POST" });
}

export async function createRazorpayOrder(plan: string): Promise<{
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}> {
  return request(`/api/billing/razorpay/order?plan=${plan}`, { method: "POST" });
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
