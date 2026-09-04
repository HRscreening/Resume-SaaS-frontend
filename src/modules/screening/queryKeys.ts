import type {ScreeningsSearchParams,ScreeningSearchParams as ScoredResumeSearchFilterSchema,ApplicationsSearchParams } from "@/modules/screening/types/searchSchema";


// --------------------------------- Screening Query Keys ---------------------------------
export const ScreeningQueryKeys = {
    all: ["screenings"] as const,

    list: ["screenings", "list"] as const,

    getScreening: (screeningId: string) =>
        [...ScreeningQueryKeys.all, screeningId] as const,

    screenings: (params?:ScreeningsSearchParams) => [...ScreeningQueryKeys.all, "list",params] as const,

    
}


// --------------------------------- Application Query Keys ---------------------------------
export const ApplicationQueryKeys = {
    all: ["applications"] as const,

    screening: (screeningId: string) =>
        [...ApplicationQueryKeys.all, screeningId] as const,

    getApplications: (
        screeningId: string,
        params: ApplicationsSearchParams,
    ) =>
        [...ApplicationQueryKeys.screening(screeningId), params] as const,
    };
    
    
// --------------------------------- Active Batches Query Keys ---------------------------------

export const ResumeParsingQueryKeys = {
    all: ["resumeParsing"] as const,

    screening: (screeningId: string) =>
        [...ResumeParsingQueryKeys.all, screeningId] as const,

    batch: (screeningId: string, batchId: string) =>
        [...ResumeParsingQueryKeys.screening(screeningId), batchId] as const,

    getActiveParsings: (
        screeningId: string,
        batchId: string,
    ) =>
        [...ResumeParsingQueryKeys.screening(screeningId), batchId] as const,
};

export const ResumeScoringQueryKeys = {
    all: ["resumeScoring"] as const,

    screening: (screeningId: string) =>
        [...ResumeScoringQueryKeys.all, screeningId] as const,

    batch: (screeningId: string, batchId: string) =>
        [...ResumeScoringQueryKeys.screening(screeningId), batchId] as const,

    getActiveScorings: (
        screeningId: string,
        batchId: string,
    ) =>
        [...ResumeScoringQueryKeys.screening(screeningId), batchId] as const,
};


export const ActiveBatchesQueryKeys = {
    all: ["activeBatches"] as const,

    screening: (screeningId: string) =>
        [...ActiveBatchesQueryKeys.all, screeningId] as const,
};




// --------------------------------- Screening Usage Query Keys ---------------------------------
// Per-job counters (resumes processed, resumes scored, voice calls made) shown
// in the screening detail header. Not nested under ScreeningQueryKeys.all
// because no existing write path invalidates that prefix on the writes that
// actually change these counters (see queryKeys used at the resume-upload,
// scoring, and application-mutation call sites) — this key is invalidated
// explicitly at each of those sites instead.
export const ScreeningUsageQueryKeys = {
    all: ["screening-usage"] as const,

    screening: (screeningId: string) =>
        [...ScreeningUsageQueryKeys.all, screeningId] as const,
};


// --------------------------------- Screening Results Query Keys ---------------------------------


export const ScreeningResultsQueryKeys = {
    all: ["screeningResults"] as const,
    
    screening: (screeningId: string) =>
        [...ScreeningResultsQueryKeys.all, screeningId] as const,

    getScreenings: (
        screeningId: string,
        params:ScoredResumeSearchFilterSchema 
    ) =>
        [...ScreeningResultsQueryKeys.screening(screeningId), params] as const,
};

