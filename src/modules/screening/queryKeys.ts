import { getScreening } from "@/lib/api";


// --------------------------------- Screening Query Keys ---------------------------------
export const ScreeningQueryKeys = {
    all: ["screenings"] as const,

    getScreening: (screeningId: string) =>
        [...ScreeningQueryKeys.all, screeningId] as const,

}


// --------------------------------- Application Query Keys ---------------------------------
export const ApplicationQueryKeys = {
    all: ["applications"] as const,

    screening: (screeningId: string) =>
        [...ApplicationQueryKeys.all, screeningId] as const,

    getApplications: (
        screeningId: string,
        limit: number
    ) =>
        [...ApplicationQueryKeys.screening(screeningId), limit] as const,
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




// --------------------------------- Screening Results Query Keys ---------------------------------
import { CandidateQueryState } from "@/modules/screening/types/screening.type";
export const ScreeningResultsQueryKeys = {
    all: ["screeningResults"] as const,
    
    screening: (screeningId: string) =>
        [...ScreeningResultsQueryKeys.all, screeningId] as const,

    getScreenings: (
        screeningId: string,
        params:Omit<CandidateQueryState, "cursor">
    ) =>
        [...ScreeningResultsQueryKeys.screening(screeningId), params] as const,
};

