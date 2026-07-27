export type CandidateOverview = {
    id: string;

    candidate_name: string;
    candidate_current_job: string | null;

    candidate_metadata: Record<string, any> | null;

    skills: string[] | null;
    total_resumes: number;

    avg_score: number | null;
    best_score: number | null;

    applied_roles: string[];
};




export type CandidateDetails = {
    resume_id: string;
    screening_id: string;
    screening_title: string;
    score_id: string;
    candidate_score: number;
    stage: string;
    stage_history: Array<Record<string, any>>;
    created_at: string;
    updated_at: string;
    screening_avg_score: number;
}


import type { MatchTierId, RangeFilter} from "@/types/index";

export type SortField = "best_score" | "avg_score" | "candidate_name" | "stage" | "total_resumes" | `cat:${string}`;

export interface SortRule {
  field: SortField;
  direction: "asc" | "desc";
}


export type CandidateRepositoryQueryParams = {
    page: number;
    page_size: number;
    search: string;
    stage: string[];
    match: MatchTierId[];
    best_score?: RangeFilter;
    avg_score?:RangeFilter;
    sort: SortRule[];
}