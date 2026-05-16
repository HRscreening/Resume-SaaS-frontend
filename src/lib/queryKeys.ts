// lib/queryKeys.ts
export const queryKeys = {
  screening: (screeningId: string, resumeId: string) =>
    ['screening', screeningId, resumeId] as const,
};
