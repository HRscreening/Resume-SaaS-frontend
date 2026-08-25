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

export type ScreeningStatus = "draft" | "pending" | "processing" | "completed" | "failed";

export interface StageConfig {
  color: string;
  index: number;
}

export type StagesMap = Record<string, StageConfig>;


// export interface ScreeningListItem {
//   id: string;
//   title: string;
//   total_applications: number;
//   screened_applications: number;
//   avg_score: number | null;
//   last_accessed_at: string | null;
//   created_at: string;
//   archived_at?: string | null;
//   deleted_at?: string | null;
// }


export interface Screening {
  id: string;
  title: string;
  jd_url: string | null;
  rubric: Rubric | null;
  parsed_cnt: number;
  screened_cnt: number;
  stages?: StagesMap;
  created_at: string;
  last_accessed_at: string | null;
  archived_at?: string | null;
  deleted_at?: string | null;

}

// export interface Screening {
//   id: string;
//   user_id: string;
//   title: string;
//   raw_jd_text: string;
//   jd_url: string | null;
//   rubric: Rubric | null;
//   status: ScreeningStatus;
//   total_resumes: number;
//   scored_resumes_cnt: number;
//   applications_cnt: number
//   avg_score: number | null;
//   stages?: StagesMap;
//   created_at: string;
//   updated_at: string;
//   parsing_batch_ids: string[] | null;
// }

export type SingleProgressBar = {
  title: string;
  description?: string;
  value: number;
  color: string;
};






export type MatchTierId = "strong" | "potential" | "risky" | "poor";

export interface RangeFilter {
  min?: number;
  max?: number;
}

export type SortField = "overall_score" | "candidate_name" | "stage" | `cat:${string}`;

export interface SortRule {
  field: SortField;
  direction: "asc" | "desc";
}

export interface CandidateQueryState {
  cursor: string | null;
  limit: number;
  search: string;
  stage: string[];
  match: MatchTierId[];
  overall_score?: RangeFilter;
  // Keyed by rubric category name. Stored exactly as it appears in the rubric.
  category_scores: Record<string, RangeFilter>;
  sort: SortRule[];
}




export type HiringStage = string;



export interface CategoryScore {
  category: string;
  avg_score: number;     // 0–10
  criteria_count: number;
}


export interface RankedCandidate {
  rank: number;
  resume_id: string;
  score_id: string;
  filename: string;
  candidate_name: string | null;
  candidate_email: string | null;
  candidate_phone: string | null;
  candidate_current_job: string | null;
  candidate_current_company: string | null;
  experience_years: number | null;
  overall_score: number;
  category_scores: CategoryScore[];
  overall_summary: string;
  stage?: HiringStage;
  resume_url?: string | null;
  /** Voice round outcome, so the list shows who screened well without opening
   *  each drawer. All null when no call was ever placed. */
  voice_score?: number | null;
  voice_status?: string | null;
  voice_recommendation?: string | null;
}


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
  /** Voice round outcome, so the list shows who screened well without opening
   *  each drawer. All null when no call was ever placed. */
  voice_score?: number | null;
  voice_status?: string | null;
  voice_recommendation?: string | null;
}



export interface PaginatedResults<T> {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
}