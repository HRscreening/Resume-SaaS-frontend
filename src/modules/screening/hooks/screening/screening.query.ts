import { useQuery, useMutation, useQueryClient,useInfiniteQuery } from "@tanstack/react-query";
import { getScreenings } from "@/modules/screening/apis/screenings.api"
import type { CandidateQueryState, PaginatedResults } from "@/modules/screening/types/screening.type";
import { ScreeningResultsQueryKeys } from "@/modules/screening/queryKeys"



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

        queryFn: ({ pageParam }:{pageParam:string | null}) =>
            
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