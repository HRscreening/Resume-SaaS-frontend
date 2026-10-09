export const AnalyticsEvent = {
  LOGIN: "login",
  LOGOUT: "logout",
  TAB_SWITCHED: "tab_switched",
  APPLICATION_TAB_CLICKED: "application_tab_clicked",
  APPLICATION_RESUME_OPENED: "application_resume_opened",
  JOB_TYPE_SWITCHED: "job_type_switched",
  SCREENING_VIEWED: "screening_viewed",
  CANDIDATE_ANALYSIS_OPENED: "candidate_analysis_opened",
  FILTERS_APPLIED: "filters_applied",

  JOB_CREATE_STARTED: "job_create_started",
  JOB_CREATION_VIEWED: "job_creation_viewed",
  JOB_CREATION_STEP_VIEWED: "job_creation_step_viewed",
  JOB_CREATION_VALIDATION_FAILED: "job_creation_validation_failed",
  JOB_CREATION_FAILED: "job_creation_failed",
  JOB_CREATION_ABANDONED: "job_creation_abandoned",
  JD_INPUT_MODE_CHANGED: "jd_input_mode_changed",
  JOB_CREATED: "job_created",
  JD_VIEWED: "jd_viewed",
  JD_FILE_UPLOADED: "jd_file_uploaded",
  JD_GENERATION_STARTED: "jd_generation_started",
  JD_GENERATION_COMPLETED: "jd_generation_completed",
  JD_GENERATION_FAILED: "jd_generation_failed",
  RUBRIC_GENERATION_COMPLETED: "rubric_generation_completed",
  RUBRIC_EDITED: "rubric_edited",
  RUBRIC_VIEWED: "rubric_viewed",
  JOB_SOURCING_ALLOWED: "job_sourcing_allowed",
  JOB_POST_STARTED: "job_post_started",
  RESUME_UPLOAD_PANEL_OPENED: "resume_upload_panel_opened",
  MULTI_SELECT_ACTION: "multi_select_action",
  ROW_MENU_ACTION: "row_menu_action",

  RESUME_UPLOADED: "resume_uploaded",
  RESUME_SCREENED: "resume_screened",
  FUNNEL_STAGE_CHANGED: "funnel_stage_changed",
  RESCORING_STARTED: "rescoring_started",
  RESUME_DOWNLOADED: "resume_downloaded",
  SCORECARD_DOWNLOADED: "scorecard_downloaded",
  ANALYSIS_EXPANDED: "analysis_expanded",
  RESUME_ANALYSIS_SHARED: "resume_analysis_shared",

  VOICE_SCREENING_STARTED: "voice_screening_started",
  VOICE_SCREENING_SCHEDULED: "voice_screening_scheduled",
  VOICE_SCREENING_CANCELLED: "voice_screening_cancelled",
  VOICE_SCREENING_COMPLETED: "voice_screening_completed",
} as const;

export type AnalyticsEventName =
  typeof AnalyticsEvent[keyof typeof AnalyticsEvent];

export interface AnalyticsEventProperties {
  login: { method: "password" | "google" };
  logout: Record<string, never>;
  job_type_switched: { type: string };
  tab_switched: { tab: string; screeningId: string };
  application_tab_clicked: { screeningId: string };
  application_resume_opened: { screeningId: string; resumeId: string };
  screening_viewed: { screeningId: string };
  candidate_analysis_opened: { screeningId: string; resumeId: string };
  filters_applied: { screeningId: string; filterCount: number };

  job_create_started: { source: "dashboard" | "empty_state" };
  job_creation_viewed: { source?: "dashboard" | "empty_state" | "direct" };
  job_creation_step_viewed: { step: "jd" | "rubric" };
  job_creation_validation_failed: {
    reason: "missing_title" | "missing_jd" | "missing_rubric";
  };
  job_creation_failed: {
    reason: "jd_extraction" | "jd_generation" | "job_save";
  };
  job_creation_abandoned: {
    step: "jd" | "rubric";
    hasTitle: boolean;
    hasJd: boolean;
  };
  jd_input_mode_changed: { mode: "paste" | "upload" | "ai" };
  job_created: { jobId: string; source: "dashboard" | "template" };
  jd_file_uploaded: { fileType: string };
  jd_generation_started: { inputMode: "paste" | "upload" | "ai" };
  jd_generation_completed: { inputMode: "paste" | "upload" | "ai" };
  jd_generation_failed: { inputMode: "paste" | "upload" | "ai" };
  rubric_generation_completed: { categoryCount: number };
  rubric_edited: {
    editType: "category_weight" | "subcategory" | "remove" | "add";
  };
  rubric_viewed: { screeningId: string };
  job_sourcing_allowed: { allowed: boolean };
  job_post_started: { screeningId: string };
  resume_upload_panel_opened: { screeningId: string; uploadedCount: number };
  multi_select_action: {
    screeningId: string;
    operation: "cancel" | "export" | "download" | "screen" | "archive" | "unarchive" | "delete" | "share" | "call" | "rescore" | "change_stage";
    selectedCount: number;
  };
  row_menu_action: {
    screeningId: string;
    table: "applications" | "screening";
    operation: "resume" | "scorecard" | "profile" | "voice" | "rescore" | "expand" | "share" | "archive" | "unarchive" | "delete" | "addNote";
    resumeId: string;
  };

  resume_uploaded: { screeningId: string; fileCount: number };
  resume_screened: { screeningId: string; batchId: string; screenedCount: number };
  funnel_stage_changed: { screeningId: string; scoreId: string; stage: string };
  rescoring_started: { screeningId: string; resumeCount: number };
  resume_downloaded: { screeningId: string; resumeId?: string };
  scorecard_downloaded: { screeningId: string; resumeId: string; scoreId: string };
  analysis_expanded: { screeningId: string; resumeId: string };
  resume_analysis_shared: {
    screeningId: string;
    resumeId: string;
    recipientCount: number;
  };

  voice_screening_started: { screeningId: string; resumeId: string };
  voice_screening_scheduled: { screeningId: string; resumeId: string };
  voice_screening_cancelled: {
    screeningId: string;
    resumeId: string;
    callId: string;
  };
  voice_screening_completed: {
    screeningId: string;
    resumeId: string;
    callId: string;
  };
}
