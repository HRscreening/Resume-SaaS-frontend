// lib/queryKeys.ts
export const queryKeys = {
  profile: () =>
    ['profile'] as const,

  screening: (screeningId: string, resumeId: string) =>
    ['screening', screeningId, resumeId] as const,

  candidateRepository: () =>
    ['candidateRepository'] as const,

  candidateDetails: (candidateId: string) =>
    ['candidateDetails', candidateId] as const,
};



