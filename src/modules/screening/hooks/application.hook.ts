import { useQuery, useMutation,useQueryClient } from "@tanstack/react-query";
import { ApplicationQueryKeys } from "@/modules/screening/queryKeys";

import { getApplications,type GetApplicationResponseType } from "@/modules/screening/apis/getApplications";
import { screenResume } from "@/modules/screening/apis/screenResumes";
import { addApplications } from "@/modules/screening/apis/addApplications";

type GetApplicationsRequestParams = {
    screening_id: string;
    page?: number;
    pageSize?: number;
    enabled?: boolean;
};

export  function useApplicationsQuery({
    screening_id,
    page = 1,
    pageSize = 10,
    enabled
}: GetApplicationsRequestParams) {
    // console.log("useApplicationsQuery called with params:", { screening_id, page, pageSize, enabled });
    return useQuery({
        queryKey: ApplicationQueryKeys.getApplications(
            screening_id,
            page,
            pageSize
        ),
        queryFn: () =>
            getApplications({
                screening_id,
                page,
                pageSize,
            }),
        // enabled: (enabled ?? true) && !!screening_id,
        staleTime: 6 * 60 * 60 * 1000, //! 6 hours as the data is not expected to change frequently
    });
}




export function useScreeningApplicationsMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: screenResume,

        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ApplicationQueryKeys.screening(
                    variables.screening_id
                ),
            });
        },

        gcTime: 6 * 60 * 60 * 1000,
    });
}


export function useAddApplicationsMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: addApplications,

        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ApplicationQueryKeys.screening(
                    variables.screening_id
                ),
            });
        },

        gcTime: 6 * 60 * 60 * 1000,
    });
}
