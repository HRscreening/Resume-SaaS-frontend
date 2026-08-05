import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { getScreenings } from "@/modules/screening/apis/screenings.api"
import type { CandidateQueryState, PaginatedResults,Screening } from "@/modules/screening/types/screening.type";
import { ScreeningResultsQueryKeys, ScreeningQueryKeys } from "@/modules/screening/queryKeys"
import { getScreening } from "@/modules/screening/apis/getJobDetails"


export function useScreeningQuery(screeningId: string) {
    return useQuery({
        queryKey: ScreeningQueryKeys.getScreening(screeningId),
        queryFn: () => getScreening(screeningId),
        // refetchInterval: (query) => {
        //     const s = query.state.data;
        //     if (!s || ["completed", "failed", "draft"].includes(s.status)) return false;
        //     return 5000;
        // },
    })
}

export function useScreeningResultsQuery(
    screeningId: string,
    params: Omit<CandidateQueryState, "cursor">,
    enabled = true
) {
    return useInfiniteQuery({
        queryKey: ScreeningResultsQueryKeys.getScreenings(
            screeningId,
            params
        ),

        queryFn: ({ pageParam }: { pageParam: string | null }) =>

            getScreenings(screeningId, {
                ...params,
                cursor: pageParam,
            }),

        initialPageParam: null,

        getNextPageParam: (lastPage) =>
            lastPage.has_more ? lastPage.next_cursor : undefined,

        enabled,
    });
}


