import type { ReactNode } from "react";

type RowAction = "archive" | "unarchive" | "delete" | "download" | (string & {});

interface ProcessingRowProps {
    /** Must equal the number of real <td>s this row would otherwise render */
    colSpan: number;
    action: RowAction | null | undefined;
    isProcessing: boolean;
    labels?: Record<string, string>;
    /** Fix the row height to whatever your table's normal row height is (e.g. 60) */
    rowHeight?: number;
    children: ReactNode;
    className?: string;
}

const DEFAULT_LABELS: Record<string, string> = {
    archive: "Archiving",
    unarchive: "Unarchiving",
    delete: "Deleting",
    download: "Downloading",
};

export default function ProcessingRow({
    colSpan,
    action,
    isProcessing,
    labels,
    rowHeight = 60,
    children,
    className = "",
}: ProcessingRowProps) {
    if (!isProcessing || !action) {
        return <>{children}</>;
    }

    const mergedLabels = { ...DEFAULT_LABELS, ...labels };
    const label = mergedLabels[action] ?? "Processing";

    return (
        <td
            colSpan={colSpan}
            onClick={(e) => e.stopPropagation()}
            style={{ height: rowHeight }}
            className={`p-0 align-middle overflow-hidden ${className}`}
        >
            <div
                style={{
                    height: rowHeight,
                    backgroundImage:
                         "linear-gradient(90deg, #f7f7f7 0%, #eeeeee 50%, #f7f7f7 100%)",
                    backgroundSize: "200% 100%",
                    animation: "row-shimmer-sweep 1.8s ease-in-out infinite",
                }}
                className="flex items-center justify-center gap-2 w-full"
            >
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-[#C85A17]/30 border-t-[#C85A17] animate-spin" />
                    {label}
                    <span className="inline-flex">
                        <span className="animate-bounce [animation-delay:-0.3s]">.</span>
                        <span className="animate-bounce [animation-delay:-0.15s]">.</span>
                        <span className="animate-bounce">.</span>
                    </span>
                </span>
            </div>
        </td>
    );
}