import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveScreeningStages, updateCandidateStage } from "@/modules/screening/apis/stages";
import type { StagesMap, Screening, HiringStage } from "@/modules/screening/types/screening.type";
import { ScreeningResultsQueryKeys } from "@/modules/screening/queryKeys";


export function useChangeCandidateStageMutation(screeningId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ scoreId, stage }: {
            scoreId: string;
            stage: HiringStage;
        }) => {
            // console.log("mutationFn", scoreId, stage);
            return updateCandidateStage(scoreId, stage)
        },

        onMutate: async ({ scoreId, stage }) => {

            await queryClient.cancelQueries({
                queryKey: ScreeningResultsQueryKeys.screening(screeningId),
            });

            const previous = queryClient.getQueriesData({
                queryKey: ScreeningResultsQueryKeys.screening(screeningId),
            });

            previous.forEach(([key]) => {
                queryClient.setQueryData(key, (old: any) => {
                    if (!old) return old;

                    return {
                        ...old,
                        pages: old.pages.map((page: any) => ({
                            ...page,
                            items: page.items.map((candidate: any) =>
                                candidate.score_id === scoreId
                                    ? {
                                        ...candidate,
                                        stage,
                                    }
                                    : candidate
                            ),
                        })),
                    };
                });
            });

            return { previous };
        },

        onError: (_err, _variables, context) => {
            context?.previous.forEach(([key, data]) => {
                queryClient.setQueryData(key, data);
            });
        },

        onSettled: () => {
            queryClient.invalidateQueries({
                queryKey: ScreeningResultsQueryKeys.screening(screeningId),
            });
        },
    });
}


export function useSaveScreeningStagesMutation(id: string, screening: Screening) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (next: StagesMap) => saveScreeningStages(id, next),
        onMutate: async (next) => {
            await queryClient.cancelQueries({ queryKey: ["screening", id] });
            const prev = queryClient.getQueryData<typeof screening>(["screening", id]);
            queryClient.setQueryData(
                ["screening", id],
                (old: typeof screening) => (old ? { ...old, stages: next } : old),
            );
            return { prev };
        },
        onError: (_err, _next, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(["screening", id], ctx.prev);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["screening", id] });
        },
    });
}