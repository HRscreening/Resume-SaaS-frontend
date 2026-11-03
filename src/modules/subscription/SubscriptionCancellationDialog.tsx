import { useState } from "react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    useCancelAutoPayMutation,
    useCancelScheduledDowngradeMutation,
} from "@/modules/subscription/useSubscription";
import type { UserSubscription } from "@/types/subscription.type";

function formatDate(isoString: string | null | undefined): string {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    return Number.isNaN(date.getTime())
        ? "N/A"
        : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface SubscriptionCancellationDialogProps {
    subscription: UserSubscription;
    type: "autopay" | "scheduled";
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function SubscriptionCancellationDialog({
    subscription,
    type,
    open,
    onOpenChange,
}: SubscriptionCancellationDialogProps) {
    const cancelAutoPayMutation = useCancelAutoPayMutation();
    const cancelScheduledMutation = useCancelScheduledDowngradeMutation();
    const isPending = cancelAutoPayMutation.isPending || cancelScheduledMutation.isPending;

    function handleConfirm() {
        const mutation = type === "scheduled" ? cancelScheduledMutation : cancelAutoPayMutation;
        mutation.mutate(undefined, {
            onSuccess: () => {
                onOpenChange(false);
                toast.success(type === "scheduled" ? "Scheduled downgrade cancelled." : "Subscription cancelled.");
            },
            onError: (error) => {
                toast.error(error instanceof Error ? error.message : "Could not update your subscription.");
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {type === "scheduled" ? "Cancel scheduled downgrade?" : "Cancel subscription?"}
                    </DialogTitle>
                    <DialogDescription>
                        {type === "scheduled"
                            ? "Your current plan will remain active and the scheduled change will be removed."
                            : `Your subscription will be cancelled and access will continue until ${formatDate(subscription.subscription_ends_at)}.`}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                        className="h-9 px-4 text-sm font-medium text-[#404040]"
                    >
                        Keep plan
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isPending}
                        className="h-9 rounded-xl bg-[#0F0F0F] px-5 text-sm font-medium text-white hover:bg-[#262626] disabled:opacity-60"
                    >
                        {isPending
                            ? "Updating…"
                            : type === "scheduled"
                                ? "Cancel scheduled downgrade"
                                : "Cancel subscription"}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
