import { useEffect, useState, type ReactElement } from "react";
import { toast } from "sonner";
import { NotebookPen } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog";

import type { DwongradablePlan, BillingIntervalType } from "@/types/subscription.type";

import { downgrade } from "@/modules/billing/billing_apis";
import { cancelSubscription } from "@/modules/subscription/subscription_apis";

interface ConfirmDowngradeDialogProps {
    plan: DwongradablePlan,
    cycle: BillingIntervalType,
    openOnMount?: boolean,
    onConfirmed?: () => void | Promise<void>,
    trigger?: ReactElement,
    blocked?: boolean,
}

export default function ConfirmDowngradeDialog({
    cycle = "monthly",
    plan = "FREE",
    openOnMount = false,
    onConfirmed,
    trigger,
    blocked = false,
}: ConfirmDowngradeDialogProps) {

    const queryClient = useQueryClient();
    const [open, setOpen] = useState(openOnMount);
    const [isDowngrading, setIsDowngrading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (openOnMount) setOpen(true);
    }, [openOnMount]);

    async function handleDowngrade() {
        if (isDowngrading) return;

        setIsDowngrading(true);
        setError(null);
        try {
            if (plan === "FREE") {
                await cancelSubscription();
            } else {
                await downgrade(plan, cycle);
            }
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["profile"] }),
                queryClient.invalidateQueries({ queryKey: ["usage"] }),
                queryClient.invalidateQueries({ queryKey: ["userSubscription"] }),
            ]);
            toast.success("Downgrade request submitted successfully. Your subscription will be downgraded from the next billing cycle.");
            setOpen(false);
            await onConfirmed?.();
        } catch (err) {
            const message = err instanceof Error
                ? err.message
                : "Could not submit the downgrade request. Please try again.";
            setError(message);
            toast.error(message);
        } finally {
            setIsDowngrading(false);
        }
    }


    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                setOpen(isOpen);
            }}
        >
            {!openOnMount && (
                <DialogTrigger asChild>
                    {trigger ?? (
                        <NotebookPen className="text-[#A0A0A0] hover:text-[#C85A17] cursor-pointer" size={16} />
                    )}
                </DialogTrigger>
            )}

            <DialogContent
                showCloseButton={false}
                className="
                    w-full max-w-md
                    rounded-2xl
                    border border-[#E8E5DF]
                    bg-white
                    p-5
                    shadow-xl
                    gap-0
                "
                onPointerDownOutside={(event) => {
                    event.preventDefault();
                }}
                onInteractOutside={(event) => {
                    event.preventDefault();
                }}
            >
                <DialogHeader className="space-y-0 text-left">
                    <DialogTitle className="flex justify-between text-base font-semibold text-[#0F0F0F]">
                        <span>Confirm Downgrade</span>
                    </DialogTitle>

                    <DialogDescription className="mt-1 text-xs leading-relaxed text-[#737373]">
                        {blocked
                            ? "You already have a downgrade scheduled. Cancel the existing scheduled downgrade from your profile before choosing another downgrade."
                            : `Are you sure you want to downgrade your subscription to the ${plan} plan${plan !== "FREE" ? ` with ${cycle} billing` : ""}? This will be effective from the next billing cycle.`}
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <p className="mt-4 text-xs text-red-600">{error}</p>
                )}

                <div className="mt-4 flex items-center justify-end gap-3">

                    <button
                        onClick={() => setOpen(false)}
                        disabled={isDowngrading}
                        className="
                            h-9 px-4
                            text-sm font-medium
                            text-[#404040]
                            hover:text-[#0F0F0F]
                            cursor-pointer
                        "
                    >
                        Cancel
                    </button>

                    {blocked ? (
                        <Link
                            to="/profile"
                            onClick={() => setOpen(false)}
                            className="
                                h-9 rounded-xl border border-[#0F0F0F] bg-[#0F0F0F]
                                px-5 text-sm font-medium text-white transition-colors
                                hover:bg-[#262626]"
                        >
                            Go to profile
                        </Link>
                    ) : (
                        <button
                            onClick={() => void handleDowngrade()}
                            disabled={isDowngrading}
                            className="
                            h-9
                            rounded-xl
                            border border-[#0F0F0F]
                            bg-[#0F0F0F]
                            px-5
                            text-sm font-medium text-white
                            transition-colors
                            hover:bg-[#262626]
                            disabled:cursor-not-allowed
                            disabled:opacity-60
                            cursor-pointer
                        "
                        >
                            {isDowngrading ? "Submitting…" : "Downgrade"}
                        </button>
                    )}

                </div>
            </DialogContent>

        </Dialog>
    );
}