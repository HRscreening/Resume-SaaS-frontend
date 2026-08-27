export interface Education {
  institution: string | null;
  degree: string | null;
  course_specialization: string | null;
  education_lvl: string | null;

  start_yr: number | null;
  end_yr: number | null;

  grade: string | null;
}


export interface WorkExperience {
  company: string | null;
  designation: string | null;
  company_industry: string | null;

  /**
   * ISO 8601 date string (YYYY-MM-DD or full ISO timestamp)
   */
  start_date: string | null;

  /**
   * ISO 8601 date string (YYYY-MM-DD or full ISO timestamp)
   */
  end_date: string | null;

  responsibilities: string[] | null;
  achievements: string[] | null;
}


export interface Certification {
  name: string | null;
  issuing_organization: string | null;

  /**
   * ISO 8601 date string
   */
  issue_date: string | null;

  /**
   * ISO 8601 date string
   */
  expiration_date: string | null;

  credential_url_or_id: string | null;
}

export interface Project {
  name: string | null;
  description: string | null;
  role_played: string | null;

  /**
   * e.g. "6 months", "2 years"
   */
  duration: string | null;

  technologies_used: string[] | null;
}

export interface Application {

  id: string;

  candidate_name: string;
  candidate_email: string | null;
  candidate_phone: string | null;

  candidate_current_job: string | null;
  current_company: string | null;

  /**
   * Total experience in years
   */
  total_experience: number | null;

  current_industry: string | null;

  education: Education[] | null;
  work_ex: WorkExperience[] | null;
  project: Project[] | null;
  certification: Certification[] | null;

  achievements: string[] | null;
  leadership_pors: string[] | null;

  /**
   * e.g. ["Python", "FastAPI", "Machine Learning"]
   */
  skills: string[] | null;

  languages: string[] | null;

  resume_url: string | null;
}







export type ApplicationActionStatus = {
    isProcessing: boolean;
    action: "download" | "archive" | "unarchive" | "delete" | null;
};