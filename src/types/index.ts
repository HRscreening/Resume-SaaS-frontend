// ─── Auth / Profile ──────────────────────────────────────────────────────────

export type SubscriptionPlan = "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  reported_role: string | null;
  company_name: string | null;
  plan: SubscriptionPlan;
  onboarding_completed: boolean;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageResponse {
  resumes_processed: number;
  resumes_scored: number;
  screenings_created: number;
  quota_limit: number;
  quota_remaining: number;
  plan: SubscriptionPlan;
  month: string;
}

// ─── Rubric ──────────────────────────────────────────────────────────────────

export type CriterionType = "must" | "should" | "nice";

export interface RubricCriterion {
  name: string;
  type: CriterionType;
  weight: number; // 1–5
  description: string;
}

export interface Rubric {
  criteria: RubricCriterion[];
  threshold_score: number;
  source: "AI" | "manual";
  domain?: string;
  seniority_level?: string;
}

// ─── Screenings ───────────────────────────────────────────────────────────────

export type ScreeningStatus = "draft" | "pending" | "processing" | "completed" | "failed";

export interface Screening {
  id: string;
  user_id: string;
  title: string;
  raw_jd_text: string;
  rubric: Rubric | null;
  status: ScreeningStatus;
  total_resumes: number;
  scored_resumes: number;
  avg_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface ScreeningListItem {
  id: string;
  title: string;
  status: ScreeningStatus;
  total_resumes: number;
  scored_resumes: number;
  avg_score: number | null;
  created_at: string;
}

// ─── Resumes & Scores ────────────────────────────────────────────────────────

export type ResumeStatus =
  | "UPLOADED"
  | "QUEUED_FOR_PARSING"
  | "PARSING_IN_PROGRESS"
  | "PARSED"
  | "QUEUED_FOR_SCORING"
  | "SCORING_IN_PROGRESS"
  | "SCORED"
  | "ERROR";

export interface CriterionScore {
  criterion: string;
  score: number; // 1–10
  confidence: "high" | "medium" | "low";
  evidence: string[];
  explanation: string;
}

export interface Score {
  id: string;
  resume_id: string;
  overall_score: number; // 0–100
  rank: number | null;
  breakdown: CriterionScore[];
  overall_summary: string;
  strengths: string[] | null;
  missing_elements: string[] | null;
  ai_model: string;
  processing_time_ms: number;
  created_at: string;
}

export interface Resume {
  id: string;
  screening_id: string;
  original_filename: string;
  candidate_name: string | null;
  candidate_email: string | null;
  candidate_phone: string | null;
  candidate_current_job: string | null;
  status: ResumeStatus;
  error_message: string | null;
  created_at: string;
}

export interface RankedCandidate {
  rank: number;
  resume_id: string;
  filename: string;
  candidate_name: string | null;
  candidate_email: string | null;
  candidate_current_job: string | null;
  overall_score: number;
  top_criteria: CriterionScore[];
  overall_summary: string;
}

// ─── Batch Progress ──────────────────────────────────────────────────────────

export interface SkippedFile {
  filename: string;
  error_code: string;
  reason: string;
}

export type ResumeStage = "queued" | "parsing" | "parsed" | "scoring" | "scored" | "error";

export interface FileProgress {
  resume_id: string;
  filename: string;
  status: string;
  stage: ResumeStage;
  error: string | null;
}

export interface BatchProgress {
  id: string;
  screening_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  total_files: number;
  parsed_count: number;
  scored_count: number;
  failed_count: number;
  processed_files: number;
  percentage: number;
  skipped_files: SkippedFile[];
  per_file_results: FileProgress[];
  completed_at: string | null;
}

// ─── API Request / Response Wrappers ─────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── UI State ────────────────────────────────────────────────────────────────

export interface WizardStep {
  id: number;
  label: string;
  completed: boolean;
}

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}
