

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
  overall_score: number;
  category_scores: CategoryScore[];
  overall_summary: string;
  stage?: HiringStage;
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
}



export interface PaginatedResults<T> {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
}