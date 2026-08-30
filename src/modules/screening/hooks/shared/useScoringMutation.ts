import { useQuery, useMutation, useQueryClient, useInfiniteQuery, type QueryClient, type InfiniteData } from "@tanstack/react-query";
import { ApplicationQueryKeys, ResumeParsingQueryKeys, ScreeningResultsQueryKeys, ResumeScoringQueryKeys, ActiveBatchesQueryKeys } from "@/modules/screening/queryKeys";
import { type GetActiveBatchesResponse } from "@/modules/screening/apis/activeBatches";
import { screenResume } from "@/modules/screening/apis/screenings.api"




/**
 * Used for Both Screening of Applications and Rescoring of already Scored Applications. This hook is used to perform the screen/rescore operation and update the relevant queries in the cache.
 * It invalidates the applications query to refetch the updated list of applications and updates the active batches and scoring results in the cache.
 * The mutation function takes an object with screeningId, resumeIds, and an optional isRescore flag. The onSuccess callback handles the cache updates after a successful mutation.
 * 
 * @returns {object} - An object containing the mutateAsync function to trigger the mutation and the isPending boolean indicating the mutation status.

*/
export function useScoringMutation(
    options?: {
        successMessage?: string;
        errorMessage?: string;
    }
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: screenResume,

        onSuccess: (data, variables) => {
            

            // Only invalidate applications query if this is not a rescore operation, as rescoring does not change the list of applications.
            if (!variables.isRescore) {
                queryClient.invalidateQueries({
                    queryKey: ApplicationQueryKeys.screening(
                        variables.screeningId
                    ),
                });
            }

            queryClient.invalidateQueries({
                queryKey: ScreeningResultsQueryKeys.screening(
                    variables.screeningId,
                ),
            });
          

            // console.log("Screening applications successful:", data);

            if (data?.batch_id && data.data?.length) {
                queryClient.setQueryData(
                    ActiveBatchesQueryKeys.screening(variables.screeningId),
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
                        variables.screeningId,
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