import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useCreditLogs } from "@/modules/subscription/useSubscription";
import { CreditTransactionType, type CreditLog } from "@/types/subscription.type";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 20;

const FEATURE_LABELS: Record<string, string> = {
    resume_parsing: "Resume parsing",
    resume_scoring: "Resume scoring",
    sourced_candidates: "Candidates sourced",
    voice_screen: "Voice screen",
    interview: "Interview",
    jobs_created: "Job created",
};

interface CreditLogsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    quotaPeriodId: string | null | undefined;
    currencySymbol?: string;
}



function toCredit(value: number | string | null | undefined): number {
    const n = typeof value === "number" ? value : Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
}

function formatCredit(value: number): string {
    return value.toLocaleString(undefined, {
        minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
        maximumFractionDigits: 2,
    });
}

function featureLabel(feature: string | null | undefined): string {
    if (!feature) return "Credit activity";
    return FEATURE_LABELS[feature] ?? feature.replaceAll("_", " ");
}

function transactionMeta(type: string) {
    const normalized = type.toLowerCase();
    if (normalized === CreditTransactionType.DEBIT) {
        return { label: "Used", sign: "−", className: "text-red-700 bg-red-50 border-red-200", amountClass: "text-red-700" };
    }
    if (normalized === CreditTransactionType.REFUND) {
        return { label: "Refund", sign: "+", className: "text-emerald-700 bg-emerald-50 border-emerald-200", amountClass: "text-emerald-700" };
    }
    if (normalized === CreditTransactionType.CREDIT) {
        return { label: "Added", sign: "+", className: "text-emerald-700 bg-emerald-50 border-emerald-200", amountClass: "text-emerald-700" };
    }
    return { label: "Adjustment", sign: "", className: "text-[#525252] bg-[#F5F3EE] border-[#E8E5DF]", amountClass: "text-[#0F0F0F]" };
}

export function CreditLogsDialog({
    open,
    onOpenChange,
    quotaPeriodId,
}: CreditLogsDialogProps) {
    const [page, setPage] = useState(1);
    const { data, isLoading, isError, isFetching, refetch } = useCreditLogs(
        quotaPeriodId,
        page,
        PAGE_SIZE,
        open,
    );

    useEffect(() => {
        if (!open) setPage(1);
    }, [open, quotaPeriodId]);

    const logs = data ?? [];
    const hasNext = logs.length === PAGE_SIZE;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Credit usage history</DialogTitle>
                    <DialogDescription>
                        Credits added, used, and refunded in this billing cycle.
                    </DialogDescription>
                </DialogHeader>

                {!quotaPeriodId ? (
                    <p className="text-sm text-[#737373] py-6 text-center">
                        Credit history is not available for this cycle yet.
                    </p>
                ) : isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-14 rounded-xl bg-[#F5F3EE] animate-pulse" />
                        ))}
                    </div>
                ) : isError ? (
                    <div className="py-6 text-center">
                        <p className="text-sm text-[#525252]">Couldn’t load credit history.</p>
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="mt-3 text-xs font-medium text-[#0F0F0F] underline underline-offset-2"
                        >
                            Try again
                        </button>
                    </div>
                ) : logs.length === 0 ? (
                    <p className="text-sm text-[#737373] py-6 text-center">
                        No credit activity in this cycle yet.
                    </p>
                ) : (
                    <ul className="max-h-[360px] overflow-y-auto -mx-1 px-1 space-y-2">
                        {logs.map((log, index) => (
                            <CreditLogRow
                                key={`${page}-${index}-${log.feature ?? "credit"}-${log.desc ?? ""}`}
                                log={log}
                            />
                        ))}
                    </ul>
                )}

                {quotaPeriodId && !isLoading && !isError && (page > 1 || hasNext) && (
                    <div className="flex items-center justify-between pt-1">
                        <button
                            type="button"
                            disabled={page <= 1 || isFetching}
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-medium rounded-lg text-[#525252] hover:bg-[#F5F3EE] disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            Previous
                        </button>
                        <span className="text-[11px] text-[#737373]">Page {page}</span>
                        <button
                            type="button"
                            disabled={!hasNext || isFetching}
                            onClick={() => setPage((current) => current + 1)}
                            className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-medium rounded-lg text-[#525252] hover:bg-[#F5F3EE] disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                            Next
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function CreditLogRow({ log}: { log: CreditLog; }) {
    const meta = transactionMeta(String(log.transaction_type ?? ""));
    const amount = formatCredit(toCredit(log.credit));

    return (
        <li className="flex items-start justify-between gap-3 rounded-xl border border-[#E8E5DF] bg-[#FDFCFB] px-3 py-2.5">
            <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-[#0F0F0F]">{featureLabel(log.feature)}</p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${meta.className}`}>
                        {meta.label}
                    </span>
                </div>
                {log.desc && (
                    <p className="text-[11px] text-[#737373] mt-0.5 leading-snug line-clamp-2">{log.desc}</p>
                )}
            </div>
            <p className={`text-sm font-semibold shrink-0 ${meta.amountClass}`}>
                {meta.sign}{amount}
            </p>
        </li>
    );
}

export default CreditLogsDialog;
