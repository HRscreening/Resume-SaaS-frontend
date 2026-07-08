import { useQuery } from "@tanstack/react-query";
import { ResumeParsingQueryKeys, ResumeScoringQueryKeys } from "@/modules/screening/queryKeys";

import { getActiveParsings } from "@/modules/screening/apis/getActiveParsings";
import { getActiveScorings } from "@/modules/screening/apis/getActiveScorings";

type Params = {
    screening_id: string;
    batch_id: string;
};

export function useActiveParsingQuery({
    screening_id,
    batch_id,
}: Params) {
    return useQuery({
        queryKey: ResumeParsingQueryKeys.getActiveParsings(
            screening_id,
            batch_id,
        ),
        queryFn: () =>
            getActiveParsings({
                screening_id,
                batch_id,
            }),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useActiveScoringQuery({
    screening_id,
    batch_id,
}: Params) {
    return useQuery({
        queryKey: ResumeScoringQueryKeys.getActiveScorings(
            screening_id,
            batch_id,
        ),
        queryFn: () =>
            getActiveScorings({
                screening_id,
                batch_id,
            }),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
