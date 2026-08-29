import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";


import React from 'react'

const AnalysisSheetSkeleton = () => {


    return (
        <Sheet open={true} modal={false}>
            <SheetContent
                showOverlay={false}
                className="!w-full sm:!max-w-[600px] overflow-y-auto p-0 !z-40"
            >
                {/* Sheet header skeleton */}
                <SheetHeader className="px-6 pt-6 pb-4 border-b border-[#E8E5DF]">
                    <SheetTitle className="text-sm font-semibold text-[#0F0F0F]">
                        <div className="flex items-center gap-2 mt-4">
                            <div className="h-5 w-16 rounded bg-[#E8E5DF] animate-pulse" />
                            <div className="h-5 w-16 rounded bg-[#E8E5DF] animate-pulse" />
                            <div className="h-5 w-16 rounded bg-[#E8E5DF] animate-pulse" />
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
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="h-4 w-full rounded bg-[#F0EDE8] animate-pulse" />
                        <div className="h-4 w-5/6 rounded bg-[#F0EDE8] animate-pulse" />
                        <div className="h-4 w-3/4 rounded bg-[#F0EDE8] animate-pulse" />
                        <div className="h-4 w-full rounded bg-[#F0EDE8] animate-pulse" />
                        <div className="h-4 w-2/3 rounded bg-[#F0EDE8] animate-pulse" />
                    </div>
                    <div className="space-y-3 pt-4">
                        <div className="h-20 w-full rounded-xl bg-[#F5F3EE] animate-pulse" />
                        <div className="h-20 w-full rounded-xl bg-[#F5F3EE] animate-pulse" />
                        <div className="h-20 w-full rounded-xl bg-[#F5F3EE] animate-pulse" />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

export default AnalysisSheetSkeleton


