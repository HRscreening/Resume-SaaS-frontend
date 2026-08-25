import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listScreenings, getScreeningById } from "@/modules/screening/apis/screenings.api";
import { useUserKey } from "@/lib/userKey";
import { ScreeningQueryKeys,ApplicationQueryKeys } from "@/modules/screening/queryKeys"
import type { ScreeningsSearchParams } from "@/modules/screening/types/searchSchema";

// export function usePrefetchScreening() {
//     const queryClient = useQueryClient();

//     return (id: string) => {
//         queryClient.prefetchQuery({
//             queryKey: ScreeningQueryKeys.getScreening(id),
//             queryFn: () => getScreeningById(id),
//         })   
//     }
// }



export function useScreeningsQuery(
    params: ScreeningsSearchParams
) {
    return useQuery({
        queryKey: ScreeningQueryKeys.screenings(params),
        queryFn: () => listScreenings(params),

        
    });
}