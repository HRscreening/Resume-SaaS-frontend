import { useQuery } from "@tanstack/react-query";
import { getUsage } from "@/lib/api";
import { useUserKey } from "@/lib/userKey";
import type { UsageResponse } from "@/types";

/** One place that answers "does this account have limits". */
export function deriveUsageView(usage: UsageResponse | undefined) {
  return {
    usage,
    unlimited: usage?.unlimited === true,
    totals: usage?.totals ?? [],
  };
}

export function useUsage() {
  const { data, isLoading } = useQuery({ queryKey: useUserKey("usage"), queryFn: getUsage, staleTime: 30_000 });
  return { ...deriveUsageView(data), isLoading };
}
