export interface ApplicantJobDetails {
  designation: string;
  organization: string;
  tenure: string;
  is_current: boolean;
}

export interface ApplicantEducationDetails {
  degree: string;
  institution: string;
  batch: string;
}

export interface SocialLinks {
  linkedin: string | null;
  twitter: string | null;
  facebook: string | null;
}

export interface ScoreDetails {
  gmat: number | null;
  iit: number | null;
  cat: number | null;
}

export interface MatchingTag {
  tag_name: string;
  matched: boolean;
}

export interface AdditionalInfo {
  marital_status: string | null;
  languages: string[];
  work_permit_usa: boolean | null;
  cat_percentile: number | null;
  handled_team: boolean | null;
  willing_six_days: boolean | null;
  willing_relocate: boolean | null;
  differently_abled: boolean | null;
  willing_early_stage_startup: boolean | null;
  willingness_to_travel: string | null;
  ex_defence_personnel: boolean | null;
}

export interface HiristApplication {
  id: string ;

  name: string;
  email: string;
  phone: string;

  age: number;
  sex: "Male" | "Female" | "Other";

  img_url: string | null;

  experience_years: number;

  comment: string | null;

  current_location: string;
  preferred_locations: string[];

  current_salary: string;
  expected_salary: string;

  applied_date: string;

  score: ScoreDetails | null;

  jobs: ApplicantJobDetails[];
  education: ApplicantEducationDetails[];

  resume_url: string | null;

  social_links: SocialLinks | null;

  matching_tags: MatchingTag[];

  additional_info: AdditionalInfo | null;
}