// Mirrors backend app/modules/talent_search/dtos.py and search_spec.py.

export type QuestionField = "must_have_skills" | "locations" | "min_years" | "work_mode" | "work_authorization";

export interface Option {
  id: string;
  label: string;
  description: string;
  patch: Record<string, unknown>;
}

export interface ClarifyingQuestion {
  field: QuestionField;
  question: string;
  options: Option[];
  allow_other: boolean;
}

export interface Answer {
  field: QuestionField;
  option_id?: string;
  other_text?: string;
}

export interface SpecLocation {
  country?: string | null;
  region?: string | null;
  city?: string | null;
}

export interface SearchSpec {
  role_title: string;
  seniority?: string | null;
  min_years?: number | null;
  max_years?: number | null;
  locations: SpecLocation[];
  work_mode: "onsite" | "hybrid" | "remote" | "any";
  must_have_skills: string[];
  nice_to_have_skills: string[];
  skill_synonyms: Record<string, string[]>;
  title_variants: string[];
  target_companies: string[];
  signals: string[];
  anti_signals: string[];
  work_authorization?: { country: string; sponsorship_offered: boolean } | null;
  timezone_overlap?: { base_tz: string; min_overlap_hours: number } | null;
}

export type SearchStatus = "draft" | "questions" | "searching" | "done" | "failed";

export interface TalentSearch {
  id: string;
  status: SearchStatus;
  spec: SearchSpec;
  questions: ClarifyingQuestion[];
  provider_status: Record<string, string>;
  empty_hint: string | null;
  error: string | null;
  test_mode: boolean;
}

export type SkillVerdict = { verdict: "yes" | "no" | "unknown"; evidence: string };

export interface SearchResult {
  id: string;
  rank: number;
  score: number;
  fit_band: "strong" | "good" | "partial" | "weak";
  summary: string | null;
  skill_verdicts: Record<string, SkillVerdict>;
  verdict: "pending" | "shortlisted" | "rejected";
  reject_reason: string | null;
  full_name: string | null;
  headline: string | null;
  current_title: string | null;
  current_company: string | null;
  location: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  sources: string[];
  work_history: Array<{ title?: string | null; company?: string | null; start_date?: string | null; end_date?: string | null; current?: boolean; description?: string | null }>;
  skills: string[];
  total_years: number | null;
  tenure: { total_months: number; avg_months: number; current_months: number; role_count: number };
  switch_likelihood: "high" | "medium" | "low" | "unknown";
  raw_records?: Record<string, unknown> | null;
}

export interface Coverage {
  providers: Record<string, { returned: number; fields: Record<string, number> }>;
  cross_provider_duplicates: number;
}
