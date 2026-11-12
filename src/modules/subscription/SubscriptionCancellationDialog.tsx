
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useCancelAutoPayMutation } from "@/modules/subscription/useSubscription";
import type { UserSubscription } from "@/types/subscription.type";

function formatDate(isoString: string | null | undefined): string {
    if (!isoString) return "N/A";

    const date = new Date(isoString);

    return Number.isNaN(date.getTime())
        ? "N/A"
        : date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
          });
}

interface SubscriptionCancellationDialogProps {
    subscription: UserSubscription;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function SubscriptionCancellationDialog({
    subscription,
    open,
    onOpenChange,
}: SubscriptionCancellationDialogProps) {
    const cancelAutoPayMutation = useCancelAutoPayMutation();
    const isPending = cancelAutoPayMutation.isPending;

    function handleConfirm() {
        cancelAutoPayMutation.mutate(undefined, {
            onSuccess: () => {
                onOpenChange(false);
                toast.success("Subscription cancelled successfully.");
            },
            onError: (error) => {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : "Could not cancel your subscription."
                );
            },
        });
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!isPending) onOpenChange(nextOpen);
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Cancel subscription?</DialogTitle>
                    <DialogDescription>
                        Your subscription will be cancelled, but you will
                        continue to have access to your current plan until{" "}
                        <span className="font-medium text-[#404040]">
                            {formatDate(subscription.subscription_ends_at)}
                        </span>
                        .
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                        className="h-9 px-4 text-sm font-medium text-[#404040]"
                    >
                        Keep subscription
                    </button>

                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isPending}
                        className="h-9 rounded-xl bg-[#0F0F0F] px-5 text-sm font-medium text-white hover:bg-[#262626] disabled:opacity-60"
                    >
                        {isPending ? "Cancelling…" : "Cancel subscription"}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
