import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { upgradeActionFor } from "@/lib/creditErrors";

/**
 * Toasts a failed request's message, adding an "Upgrade" action when the
 * refusal is a credit or quota limit (see upgradeActionFor).
 */
export function useErrorToast(): (error: unknown, message: string) => void {
  const navigate = useNavigate();
  return useCallback(
    (error: unknown, message: string) => {
      const upgrade = upgradeActionFor(error);
      toast.error(
        message,
        upgrade
          ? { action: { label: upgrade.label, onClick: () => navigate({ to: upgrade.to }) } }
          : undefined,
      );
    },
    [navigate],
  );
}
