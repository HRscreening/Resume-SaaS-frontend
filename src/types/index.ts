// ─── Auth / Profile ──────────────────────────────────────────────────────────

// BUSINESS is a legacy label retained in the DB enum so older rows
// written before the BUSINESS → PLUS rename still deserialize cleanly.
// New writes use PLUS.
export type SubscriptionPlan = "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE" | "PLUS";
export type PlanType = SubscriptionPlan;

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

// Plan catalog — fetched from GET /api/billing/plans. Single source of
// truth lives in backend/app/core/quota.py PLAN_LIMITS.
export interface PlanSpec {
  key: SubscriptionPlan;
  display_name: string;
  price_monthly_usd: number;
  yearly_price_monthly_usd: number;
  razorpay_amount_paise: number;
  max_resumes_per_month: number;
  max_batch_size: number;
  max_screenings: number;
  data_retention_days: number;
  export_formats: string[];
  api_access: boolean;
  display_features: string[];
}

// ─── Rubric ──────────────────────────────────────────────────────────────────

export interface Subcategory {
  name: string;
  weight: number; // 1–5 importance (1=low, 5=critical); normalised to weights during scoring
  description: string;
  is_non_negotiable?: boolean;
  is_external_context?: boolean;
}

export interface RubricCategory {
  name: string;
  weight: number; // 0–100, of overall
  subcategories: Subcategory[];
}

export interface Rubric {
  categories: RubricCategory[];
  threshold_score: number;
  source: "AI" | "MANUAL" | "COMBINED";
  domain?: string;
  seniority_level?: string;
}

// Keep for backward compat with score breakdown
export type CriterionType = "must" | "should" | "nice";
export interface RubricCriterion {
  name: string;
  type: CriterionType;
  weight: number;
  description: string;
}

// ─── Screenings ───────────────────────────────────────────────────────────────

export type ScreeningStatus = "draft" | "pending" | "processing" | "completed" | "failed";

export interface StageConfig {
  color: string;
  index: number;
}

export type StagesMap = Record<string, StageConfig>;

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
  stages?: StagesMap;
  created_at: string;
  updated_at: string;
  parsing_batch_ids: string[] | null;
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
  category: string;
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

export interface CategoryScore {
  category: string;
  avg_score: number;     // 0–10
  criteria_count: number;
}

// Hiring pipeline stage. Backend sends a free-form label (e.g. "Applied",
// "Shortlisted"); we keep it as a string and pin a known set of options in
// the UI for the dropdown. New stages added server-side surface automatically
// — they just won't appear as preset options until added to STAGES.
export type HiringStage = string;

export interface RankedCandidate {
  rank: number;
  resume_id: string;
  score_id: string;
  filename: string;
  candidate_name: string | null;
  candidate_email: string | null;
  candidate_phone: string | null;
  candidate_current_job: string | null;
  overall_score: number;
  category_scores: CategoryScore[];
  overall_summary: string;
  stage?: HiringStage;
}

export interface PaginatedResults {
  items: RankedCandidate[];
  page: number;
  page_size: number;
  total: number;
}

// ─── Candidate Query (filter / sort / search) ────────────────────────────────

export interface RangeFilter {
  min?: number;
  max?: number;
}

// Sort fields are either fixed columns ("overall_score", "candidate_name",
// "stage") or a per-rubric-category score prefixed with "cat:". Backend is
// expected to parse the prefix and resolve the category by name.
export type SortField = "overall_score" | "candidate_name" | "stage" | `cat:${string}`;

export interface SortRule {
  field: SortField;
  direction: "asc" | "desc";
}

// Match tier filter values mirror src/lib/tier.ts TIERS so the chip in the
// table column and the filter dropdown stay in sync.
export type MatchTierId = "strong" | "potential" | "risky" | "poor";

export interface CandidateQueryState {
  page: number;
  page_size: number;
  search: string;
  stage: string[];
  match: MatchTierId[];
  overall_score?: RangeFilter;
  // Keyed by rubric category name. Stored exactly as it appears in the rubric.
  category_scores: Record<string, RangeFilter>;
  sort: SortRule[];
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
