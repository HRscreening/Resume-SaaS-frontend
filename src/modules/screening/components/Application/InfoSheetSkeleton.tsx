import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

const InfoSheetSkeleton = () => {
    return (
        <Sheet open={true} modal={false}>
            <SheetContent
                showOverlay={false}
                className="!w-full sm:!max-w-[600px] overflow-y-auto p-0 !z-40"
            >
                {/* Sheet header skeleton */}
                <SheetHeader className="px-6 pt-6 pb-3 border-b border-[#E8E5DF]">
                    <SheetTitle className="text-sm font-semibold text-[#0F0F0F]">
                        <div className="flex items-center justify-between gap-3 mt-4">
                            <div className="h-4 w-28 rounded bg-[#E8E5DF] animate-pulse" />
                        </div>
                    </SheetTitle>
                </SheetHeader>
                {/* Sheet body skeleton */}
                <div className="px-6 py-6 space-y-5">
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-full bg-[#E8E5DF] animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-5 w-40 rounded bg-[#E8E5DF] animate-pulse" />
                            <div className="h-4 w-32 rounded bg-[#F0EDE8] animate-pulse" />
                            <div className="flex gap-2 mt-1">
                                <div className="h-6 w-20 rounded-lg bg-[#F5F3EE] animate-pulse" />
                                <div className="h-6 w-24 rounded-lg bg-[#F5F3EE] animate-pulse" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3 pt-2">
                        <div className="h-16 w-full rounded-xl bg-[#F5F3EE] animate-pulse" />
                        <div className="h-16 w-full rounded-xl bg-[#F5F3EE] animate-pulse" />
                        <div className="h-24 w-full rounded-xl bg-[#F5F3EE] animate-pulse" />
                        <div className="h-24 w-full rounded-xl bg-[#F5F3EE] animate-pulse" />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

export default InfoSheetSkeleton
