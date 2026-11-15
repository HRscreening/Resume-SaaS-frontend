export const GUIDE_ENUM = {
    ONBOARDING: "onboarding",
    NEW_JOB: "new_job",
    BUILD_JD_AI : "build_jd_ai",
    RUBRIC:"rubric",
    APPLICATIONS: "applications",
    APPLICATIONS_TABLE: "applications_table",
    SCREENING: "screening",
    SCREENING_CANDIDATES: "screening_candidates",
} as const;

export type GuideId = typeof GUIDE_ENUM[keyof typeof GUIDE_ENUM];




export const GUIDE_TARGET = {
  [GUIDE_ENUM.ONBOARDING]: {
    NEW_JOBS: "[data-guide='new_jobs']",
    EXISTING_JOBS: "[data-guide='existing_jobs']",
  },
  [GUIDE_ENUM.NEW_JOB]: {
    JOB_TITLE: "[data-guide='job_title']",
    JD_INPUT_BTNS: "[data-guide='jd_input_btns']",
    GENERATE_RUBRIC: "[data-guide='generate_rubric']",
  },
  [GUIDE_ENUM.BUILD_JD_AI]: {
    JOB_DETAILS: "[data-guide='job_details']",
    PROMPT_INPUT: "[data-guide='prompt_input']",
    GENERATE_JD: "[data-guide='generate_jd']",
  },
  [GUIDE_ENUM.RUBRIC]:{
    SUBCATEGORY: "[data-guide='rubric_subcategory']",
    SUBCATEGORY_WEIGHT: "[data-guide='rubric_subcategory_weight']",
    SUBCATEGORY_DELETE: "[data-guide='rubric_subcategory_delete']",
    SUBCATEGORY_ADD: "[data-guide='rubric_subcategory_add']",
  },
  [GUIDE_ENUM.APPLICATIONS]: {
    UPLOAD_CARD: "[data-guide='application_upload_card']",
    HEADER_ACTIONS: "[data-guide='application_header_actions']",
    SCREENING_TAB: "[data-guide='applications_screening_tab']",
  },
  [GUIDE_ENUM.APPLICATIONS_TABLE]: {
    ROW: "[data-guide='application_candidate_row']",
    ROW_ACTIONS: "[data-guide='application_row_actions']",
    SCREEN: "[data-guide='applications_screen']",
  },
  [GUIDE_ENUM.SCREENING]: {
    EMPTY_STATE: "[data-guide='screening_empty_state']",
    HEADER_ACTIONS: "[data-guide='screening_header_actions']",
  },
  [GUIDE_ENUM.SCREENING_CANDIDATES]: {
    CANDIDATE_ROW: "[data-guide='screening_candidate_row']",
    SCORE: "[data-guide='screening_candidate_score']",
    VOICE_HEADER: "[data-guide='screening_voice_header']",
    INTERVIEW_HEADER: "[data-guide='screening_interview_header']",
    STAGE: "[data-guide='screening_candidate_stage']",
    AI_CALL: "[data-guide='screening_ai_call']",
  }
} as const satisfies Record<GuideId, Record<string, string>>;