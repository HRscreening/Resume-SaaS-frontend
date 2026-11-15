import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useUserKey } from "@/lib/userKey";

export function useProfileQueryKey() {
  const userKey = useUserKey(...queryKeys.profile());
  const userId = userKey[userKey.length - 1];
  return useMemo(() => [...queryKeys.profile(), userId] as const, [userId]);
}

export function useProfile() {
  return useQuery({
    queryKey: useProfileQueryKey(),
    queryFn: getProfile,
    staleTime: 60_000,
  });
}
