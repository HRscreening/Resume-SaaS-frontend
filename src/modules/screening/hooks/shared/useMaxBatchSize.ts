import { useQuery } from "@tanstack/react-query";
import { getPlans, getProfile } from "@/lib/api";
import { resolveMaxBatchSize } from "@/modules/screening/utils/batchLimit";

const PLANS_STALE_MS = 24 * 60 * 60_000;
const PROFILE_STALE_MS = 5 * 60_000;

/** How many resumes the current plan screens per batch; null means no known cap. */
export function useMaxBatchSize(): number | null {
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getProfile, staleTime: PROFILE_STALE_MS });
  const { data: plans } = useQuery({ queryKey: ["plans"], queryFn: getPlans, staleTime: PLANS_STALE_MS });
  return resolveMaxBatchSize(plans, profile?.plan);
}
