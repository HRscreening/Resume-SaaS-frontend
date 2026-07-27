import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ActiveBatchesQueryKeys } from "@/modules/screening/queryKeys";
import { type GetParsingResponseType } from "@/modules/screening/apis/getActiveParsings";
import { getActiveBatches } from "@/modules/screening/apis/activeBatches";


export function useGetBatchesQuery(screening_id: string) {
    // console.log("useApplicationsQuery called with params:", { screening_id, page, pageSize, enabled });
    return useQuery({
        queryKey: ActiveBatchesQueryKeys.screening(screening_id),
        queryFn: () =>
            getActiveBatches(screening_id),
        // enabled: (enabled ?? true) && !!screening_id,
        staleTime: 3 * 60 * 1000,  // 3 minutes as the data is not expected to change frequently
        refetchInterval: ({ state }) =>
            (state.data?.parsing_batch_ids?.length ?? 0) > 0 ||
                (state.data?.scoring_batch_ids?.length ?? 0) > 0
                    ? 2 * 60 * 1000 : false,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });
}

