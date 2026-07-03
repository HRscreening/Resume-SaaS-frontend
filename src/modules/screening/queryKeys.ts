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