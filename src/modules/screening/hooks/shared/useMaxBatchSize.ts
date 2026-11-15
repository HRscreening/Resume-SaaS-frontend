import { useQuery } from "@tanstack/react-query";
import { getPlans } from "@/lib/api";
import { resolveMaxBatchSize } from "@/modules/screening/utils/batchLimit";
import { useProfile } from "@/hooks/useProfile";

const PLANS_STALE_MS = 24 * 60 * 60_000;

/** How many resumes the current plan screens per batch; null means no known cap. */
export function useMaxBatchSize(): number | null {
  const { data: profile } = useProfile();
  const { data: plans } = useQuery({ queryKey: ["plans"], queryFn: getPlans, staleTime: PLANS_STALE_MS });
  return resolveMaxBatchSize(plans, profile?.plan);
}
