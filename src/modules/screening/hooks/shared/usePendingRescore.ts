import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useUsage } from "@/hooks/useUsage";
import { useErrorToast } from "@/lib/useErrorToast";
import { useScoringMutation } from "./useScoringMutation";
import { useScreenLimits } from "./useScreenLimits";
import { useScreeningDetailsNavigation } from "./useScreeningDetailNavigation";
import { consumePendingRescore } from "@/modules/screening/utils/pendingRescore";
import { screenBlock, screeningErrorMessage } from "@/modules/screening/utils/batchLimit";

export function usePendingRescore(screeningId: string, onSuccess: () => void) {
  const { search, navigate } = useScreeningDetailsNavigation();
  const { user } = useAuth();
  const profile = useProfile();
  const { isLoading: loadingUsage } = useUsage();
  const limits = useScreenLimits();
  const { mutateAsync, isPending } = useScoringMutation();
  const showError = useErrorToast();
  const handled = useRef<string | null>(null);
  const token = search.rescoreAction;

  useEffect(() => {
    if (!token || handled.current === token || !user || profile.isPending || loadingUsage) return;
    handled.current = token;
    const pending = consumePendingRescore(token, screeningId, user.id);
    void navigate({ search: (prev) => ({ ...prev, rescoreAction: undefined }), replace: true });
    if (!pending) return; // Ordinary edit, cancellation, stale link, or already consumed.
    if (!profile.data || profile.data.active_account?.role === "viewer") {
      toast.error("Unable to start rescoring. Check your account permissions and try again.");
      return;
    }
    const blocked = screenBlock(pending.resumeIds.length, limits);
    if (blocked) { toast.error(blocked.message); return; }
    void mutateAsync({ screeningId, resumeIds: pending.resumeIds, isRescore: true })
      .then((result) => {
        toast.success(result.message || "Rescoring selected candidates started.");
        onSuccess();
      })
      .catch((error: unknown) => {
        showError(error, screeningErrorMessage(error, "Rubric saved, but rescoring could not start. Please retry Rescore."));
      });
  }, [token, user, profile.isPending, profile.data, loadingUsage, screeningId, limits.maxBatchSize, limits.quotaRemaining, navigate, mutateAsync, onSuccess, showError]);

  return isPending;
}
