import type { CallCategoryScore } from "@/types";
import { SectionCard } from "@/components/screening/voice/scorecard/AssessmentSection";
import { TONE_HEX, criterionTone, partitionMissingElements } from "@/components/screening/voice/scorecard/scorecardUtils";



export default function CategoryScores({ data }: { data: CallCategoryScore }) {
    return <div
        className="rounded-xl border border-[#E8E5DF] bg-white px-3 py-3 flex flex-col items-center text-center"
    >
        <p className="text-[10px] font-semibold text-[#737373] uppercase tracking-wide leading-tight">
            {data.category}
        </p>
        <p className="text-[10px] text-[#BDB8AE] mt-0.5">(out of 10)</p>
        {data.score !== null ? (
            <>
                <span className="text-base font-bold text-[#0F0F0F] mt-2 leading-none">
                    {data.score?.toFixed(1)}
                </span>
                <div className="w-14 h-1.5 bg-[#E8E5DF] rounded-full overflow-hidden mt-1.5">
                    <div
                        className="h-full rounded-full bg-[#C85A17]"
                        style={{ width: `${data.score * 10}%` }}
                    />
                </div>
            </>
        ) : (
            <span className="text-xs text-[#D4D4D4] mt-2">--</span>
        )}
    </div>
}


export function CategoryScoreCard2({ categories }: { categories: CallCategoryScore[] }) {


    return <SectionCard
        title="Score by category"
    >
        <div className="space-y-2">
            {categories.map((cat) => {
                const tone = criterionTone(cat.score);
                return (
                    <div key={cat.category}>
                        <div className="flex items-baseline justify-between gap-2">
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#0F0F0F]">
                                {cat.category}
                            </span>
                            <span
                                className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums"
                                style={{ color: TONE_HEX[tone] }}
                            >
                                {cat.score?.toFixed(1)}
                                <span className="text-[10px] font-normal text-[#A3A3A3]">/10</span>
                            </span>
                           
                        </div>
                        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[#EAE7DF]">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: `${Math.max(0, Math.min(100, cat.score * 10))}%`,
                                    backgroundColor: TONE_HEX[tone],
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    </SectionCard>
}