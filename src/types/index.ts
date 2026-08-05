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
  jd_url: string | null;
  rubric: Rubric | null;
  status: ScreeningStatus;
  total_resumes: number;
  scored_resumes_cnt: number;
  applications_cnt:number
  avg_score: number | null;
  stages?: StagesMap;
  created_at: string;
  updated_at: string;
  parsing_batch_ids: string[] | null;
}

export interface ScreeningListItem {
  id: string;
  title: string;
  total_applications: number;
  screened_applications: number;
  avg_score: number | null;
  last_accessed_at: string | null;
  created_at: string;
}
// export interface ScreeningListItem {
//   id: string;
//   title: string;
//   status: ScreeningStatus;
//   total_applications: number;
//   screened_applications: number;
//   total_resumes: number;
//   scored_resumes: number;
//   avg_score: number | null;
//   created_at: string;
// }

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
  page?: number;
  limit: number;
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

// ─── Voice Screening Round ─────────────────────────────────────────────────

export interface QuestionPlanItem {
  text: string;
  competency_ref: string;
  expected_signals: string[];
}

export interface VoiceSettings {
  tts_voice_id: string;
  tier: "default" | "premium";
}

export interface CallingWindow {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
  tz: string;
}

export interface RetryPolicy {
  max_attempts: number;
  backoff: "exponential" | "linear" | "fixed";
}

export interface QualificationConfig {
  budget_cap?: number | null;
  budget_band_pct?: number;
  work_model?: "remote" | "onsite" | "hybrid" | null;
  job_city?: string | null;
  relocation_required?: boolean;
  distance_threshold_km?: number;
  ask_notice?: boolean;
  ask_compensation?: boolean;
  ask_location?: boolean;
  role_facts?: string[];
}

export interface VoiceConfig {
  enabled: boolean;
  question_plan: QuestionPlanItem[];
  // Company the agent names when introducing itself. Falls back to the parsed
  // JD's company; without either, calls are blocked (the greeting would be
  // generic and read as a spam call).
  hiring_company?: string | null;
  voice: VoiceSettings;
  language: "en";
  calling_window: CallingWindow;
  default_country_code: string;
  retry_policy: RetryPolicy;
  max_concurrent_calls_override: number | null;
  qualification?: QualificationConfig | null;
}

export interface VoiceConfigResponse {
  screening_id: string;
  voice_config: VoiceConfig | null;
}

export interface GenerateQuestionPlanResponse {
  question_plan: QuestionPlanItem[];
  // Detected from the JD; UI defaults ask_location off for remote roles.
  is_remote_job: boolean;
}

// ─── Voice calls + scorecards (Phase 2) ────────────────────────────────────

export type CallStatus =
  | "QUEUED" | "DIALING" | "IN_PROGRESS"
  | "NO_ANSWER" | "BUSY" | "VOICEMAIL" | "DROPPED" | "FAILED"
  | "COMPLETED" | "QUEUED_FOR_SCORING" | "SCORING" | "SCORED" | "ERROR";

export type CallDisplayStatus =
  | "queued" | "calling" | "in_interview" | "processing" | "ready" | "unreachable";

export type RecordingStatus = "none" | "processing" | "ready" | "failed";

export interface CallListItem {
  id: string;
  resume_id: string;
  candidate_name: string | null;
  phone_e164: string;
  status: CallStatus;
  display_status: CallDisplayStatus;
  display_detail: string | null;
  recording_status: RecordingStatus | null;
  attempt_no: number;
  provider: string | null;
  duration_seconds: number | null;
  has_transcript: boolean;
  error_message: string | null;
  voice_score: number | null;
  recommendation: string | null;
  is_partial: boolean;
  resume_score: number | null;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SkippedResume {
  resume_id: string;
  candidate_name: string | null;
  candidate_phone: string | null;
  reason: string;
}

export type CandidateCallReason = "callable" | "recall" | "in_progress" | "no_phone";

export interface CallCandidate {
  resume_id: string;
  candidate_name: string | null;
  candidate_phone: string | null;
  phone_e164: string | null;
  eligible: boolean;
  reason: CandidateCallReason;
  last_call_id: string | null;
  last_call_status: CallDisplayStatus | null;
  voice_score: number | null;
}

export interface CallCandidatesResponse {
  voice_ready: boolean;
  hiring_company?: string | null;
  default_country_code: string;
  candidates: CallCandidate[];
}

export interface TriggerCallsResponse {
  created: CallListItem[];
  skipped: SkippedResume[];
}

export interface CallsListResponse {
  calls: CallListItem[];
}

export interface TranscriptTurn {
  speaker: string;
  text: string;
  ts: number;
  confidence: number | null;
}

export interface ScoreDriverCategory {
  name: string;
  weight_pct: number;
  avg_score: number;
  contribution_points: number;
  delta_points: number;
  direction: "positive" | "negative" | "neutral";
}

export interface ScoreDriverCriterion {
  criterion: string;
  category: string;
  score: number;
  impact_points: number;
}

export interface ScoreDrivers {
  baseline: number;
  overall_score: number;
  categories: ScoreDriverCategory[];
  positive_drivers: ScoreDriverCriterion[];
  negative_drivers: ScoreDriverCriterion[];
}

export interface QualificationFacts {
  current_ctc: string | null;
  expected_ctc: string | null;
  ctc_in_band: boolean | null;
  notice_period: string | null;
  candidate_location: string | null;
  relocation_willing: boolean | null;
}

export interface Qualification {
  verdict: "qualified" | "needs_review" | "not_a_fit";
  verdict_reason: string;
  facts: QualificationFacts;
  interest_summary: string;
  role_read: string[];
  flags: string[];
  reschedule_requested: string | null;
}

export interface CallScorecardDetail {
  call_id: string;
  resume_id: string;
  candidate_name: string | null;
  status: CallStatus;
  score_id: string | null;
  stage: string | null;
  overall_score: number | null;
  resume_score: number | null;
  recommendation: string | null;
  breakdown: unknown[];
  grounding_data: unknown[];
  overall_summary: string | null;
  strengths: string[] | null;
  missing_elements: string[] | null;
  flags: string[] | null;
  is_partial: boolean;
  reviewer_override: Record<string, unknown> | null;
  transcript: TranscriptTurn[] | null;
  recording_url: string | null;
  score_drivers: ScoreDrivers | null;
  qualification: Qualification | null;
}

export interface ScorecardOverrideRequest {
  overall_score?: number;
  recommendation?: "advance" | "hold" | "reject";
  notes?: string;
}

export interface CallArtifactsResponse {
  call_id: string;
  recording_status: RecordingStatus;
  recording_download_url: string | null;
  transcript_available: boolean;
  transcript_download_url: string | null;
}
