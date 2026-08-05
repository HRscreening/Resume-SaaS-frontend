import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveScreeningStages,updateCandidateStage } from "@/modules/screening/apis/stages";
import type { StagesMap, Screening } from "@/modules/screening/types/screening.type";



export function useChangeCandidateStageMutation(scoreId: string, stage: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => updateCandidateStage(scoreId, stage),
    })

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