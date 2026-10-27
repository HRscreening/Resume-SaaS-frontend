import { useUsage } from "@/hooks/useUsage";
import { useMaxBatchSize } from "@/modules/screening/hooks/shared/useMaxBatchSize";
import type { ScreenLimits } from "@/modules/screening/utils/batchLimit";

/**
 * The limits the server will apply to the next Screen or Rescore request.
 * Both numbers are read from the endpoints that enforcement itself uses:
 * the plan catalog for the batch cap, and the usage row for what is left.
 */
export function useScreenLimits(): ScreenLimits {
  const maxBatchSize = useMaxBatchSize();
  const { usage, unlimited } = useUsage();
  const quotaRemaining = unlimited ? null : usage?.quota_remaining ?? null;
  return { maxBatchSize, quotaRemaining };
}
