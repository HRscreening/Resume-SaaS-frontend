import { Skeleton } from "@/components/ui/skeleton";

export default function ScreeningDetailSkeleton() {
    return (
        <div className="flex flex-col">
            {/* Header */}
            <div className="px-4 pt-6 pb-4 sm:px-6 sm:pt-8 md:px-8">
                <div className="flex items-start justify-between gap-6">
                    <div className="space-y-3">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-7 w-64" />
                        <Skeleton className="h-4 w-40" />
                    </div>

                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-24 rounded-full" />
                        <Skeleton className="h-9 w-24 rounded-full" />
                        <Skeleton className="h-9 w-24 rounded-full" />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-4 sm:px-6 md:px-8">
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-32 rounded-t-lg" />
                    <Skeleton className="h-10 w-32 rounded-t-lg" />
                </div>
            </div>

            {/* Content */}
            <div className="px-4 pb-6 sm:px-6 md:px-8 pt-4">
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-56 rounded-lg" />
                        <Skeleton className="h-9 w-24 rounded-lg" />
                        <Skeleton className="h-9 w-24 rounded-lg" />
                    </div>

                    <Skeleton className="h-9 w-24 rounded-lg" />
                </div>

                {/* Lightweight candidate preview */}
                <div className="rounded-2xl border border-[#E8E5DF] bg-white overflow-hidden">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-6 px-5 py-5 border-b border-[#F0EEE8] last:border-b-0"
                        >
                            <Skeleton className="h-9 w-9 rounded-full" />

                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-36" />
                                <Skeleton className="h-3 w-24" />
                            </div>

                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-14" />
                            <Skeleton className="h-7 w-20 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}