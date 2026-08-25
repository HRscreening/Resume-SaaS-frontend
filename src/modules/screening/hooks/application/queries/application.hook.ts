import { useQuery, useMutation, useQueryClient, useInfiniteQuery, type QueryClient, type InfiniteData } from "@tanstack/react-query";
import { ApplicationQueryKeys, ResumeParsingQueryKeys, ResumeScoringQueryKeys, ActiveBatchesQueryKeys } from "@/modules/screening/queryKeys";
import { getApplications } from "@/modules/screening/apis/getApplications";
import { screenResume } from "@/modules/screening/apis/screenResumes";
import { addApplications } from "@/modules/screening/apis/addApplications";
import { type GetActiveBatchesResponse } from "@/modules/screening/apis/activeBatches";
import type { ApplicationsSearchParams } from "@/modules/screening/types/searchSchema";
import type { Application } from "@/modules/screening/types/application.type";
import type { PaginatedResults } from "@/modules/screening/types/screening.type";

export function useApplicationsInfiniteQuery({
    screening_id,
    params,
    limit = 10,
}: {
    screening_id: string;
    params: ApplicationsSearchParams;
    limit?: number;
}) {
    return useInfiniteQuery({
        queryKey: ApplicationQueryKeys.getApplications(
            screening_id,
            params
        ),
        initialPageParam: null as string | null,

        queryFn: ({ pageParam }: { pageParam: string | null }) =>
            getApplications({
                screening_id,
                params,
                cursor: pageParam,
                limit: limit,
            }),

        getNextPageParam: (lastPage) =>
            lastPage.has_more ? lastPage.next_cursor : undefined,

        staleTime: 6 * 60 * 60 * 1000,
    });
}

export function useScreeningApplicationsMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: screenResume,

        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ApplicationQueryKeys.screening(
                    variables.screening_id
                ),
            });
            // Invalidate screening details query so processing accordion updates
            // queryClient.invalidateQueries({
            //     queryKey: ["screening", variables.screening_id],
            // });
            // queryClient.invalidateQueries({
            //     queryKey: ["batch-progress", variables.screening_id],
            // });

            // console.log("Screening applications successful:", data);

            if (data?.batch_id && data.data?.length) {
                queryClient.setQueryData(
                    ActiveBatchesQueryKeys.screening(variables.screening_id),
                    (old: GetActiveBatchesResponse | undefined) => {
                        if (!old) return old;
                        return {
                            ...old,
                            scoring_batch_ids: [...(old.scoring_batch_ids || []), data.batch_id],
                        };
                    }
                );

                queryClient.setQueryData(
                    ResumeScoringQueryKeys.getActiveScorings(
                        variables.screening_id,
                        data.batch_id
                    ),
                    {
                        total: data.data.length,
                        resumes: data.data,
                    }
                );
            }
        },

        gcTime: 6 * 60 * 60 * 1000,
    });
}

export function useAddApplicationsMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: addApplications,

        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ApplicationQueryKeys.screening(
                    variables.screening_id
                ),
            });

            if (data?.batch_id && data.data?.length) {
                queryClient.setQueryData(
                    ActiveBatchesQueryKeys.screening(variables.screening_id),
                    (old: GetActiveBatchesResponse | undefined) => {
                        if (!old) return old;
                        return {
                            ...old,
                            parsing_batch_ids: [...(old.parsing_batch_ids || []), data.batch_id],
                        };
                    }
                );

                queryClient.setQueryData(
                    ResumeParsingQueryKeys.getActiveParsings(
                        variables.screening_id,
                        data.batch_id
                    ),
                    {
                        total: data.data.length,
                        resumes: data.data,
                    }
                );
            }
        },

        gcTime: 6 * 60 * 60 * 1000,
    });
}










// ---------------------------- Application Resune Archive/Unarchive/ Delete Mutations ----------------------------
function removeApplicationFromListCache(
    queryClient: QueryClient,
    params: ApplicationsSearchParams,
    screeningId: string,
    resumeId: string
) {
    queryClient.setQueryData<InfiniteData<PaginatedResults<Application>, string>>(
        ApplicationQueryKeys.getApplications(screeningId, params),
        (oldData) => {
            if (!oldData) return oldData;

            return {
                ...oldData,
                pages: oldData.pages.map((page) => ({
                    ...page,
                   items: page.items.filter(
                        (application) => application.id !== resumeId
                    ),
                })),
            };
        }
)}


import type { ApplicationActionStatus } from "@/modules/screening/types/application.type";
export function useApplicationUtility(
    mutationFn: ({ screeningId, resumeId }: { screeningId: string, resumeId: string }) => Promise<unknown>,
    params: ApplicationsSearchParams,
    action:ApplicationActionStatus["action"]
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn,
        mutationKey: ["application", action],

        onSuccess: (_, { screeningId, resumeId }) => {
            removeApplicationFromListCache(
                queryClient,
                params,
                screeningId,
                resumeId
            );

            queryClient.invalidateQueries({
                queryKey: ApplicationQueryKeys.screening(screeningId),
            });
        },
    });
}

