
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

import { Link } from "@tanstack/react-router";

interface ConfirmDowngradeDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

export default function ConfirmDowngradeDialog({
    open,
    setOpen,
}: ConfirmDowngradeDialogProps) {

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent
                className="
                    w-full max-w-md
                    rounded-2xl
                    border border-[#E8E5DF]
                    bg-white p-5
                    shadow-xl
                    gap-0
                "
            >
                <DialogHeader className="space-y-0 text-left">
                    <DialogTitle className="
                        text-base font-semibold
                        text-[#0F0F0F]
                    ">
                        Downgrade Not Available
                    </DialogTitle>

                    <DialogDescription className="
                        mt-2 text-xs leading-relaxed
                        text-[#737373]
                    ">
                        Downgrading your plan isn't available while you
                        have an active subscription.

                        To switch to a lower plan, you'll first need to
                        cancel your current subscription and wait until
                        the end of your current billing period.

                        Your existing plan and its benefits will remain
                        active until then. Once your subscription expires,
                        you can choose a different plan.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-5 flex items-center justify-end gap-3">

                    <button
                        onClick={() => setOpen(false)}
                        className="
                            h-9 px-4
                            text-sm font-medium
                            text-[#404040]
                            hover:text-[#0F0F0F]
                            cursor-pointer
                        "
                    >
                        Keep Subscription
                    </button>

                    <Link
                        to="/profile"
                        className="
                            inline-flex h-9 items-center
                            justify-center rounded-xl
                            border border-[#0F0F0F]
                            bg-[#0F0F0F]
                            px-5 text-sm font-medium
                            text-white transition-colors
                            hover:bg-[#262626]
                        "
                    >
                        Cancel Subscription
                    </Link>

                </div>
            </DialogContent>
        </Dialog>
    );
}
