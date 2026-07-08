export const ScreeningQueryKeys = {
    all: ["screenings"] as const,
}

export const ApplicationQueryKeys = {
    all: ["applications"] as const,

    screening: (screeningId: string) =>
        [...ApplicationQueryKeys.all, screeningId] as const,

    getApplications: (
        screeningId: string,
        page: number,
        pageSize: number
    ) =>
        [...ApplicationQueryKeys.screening(screeningId), page, pageSize] as const,
};


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
