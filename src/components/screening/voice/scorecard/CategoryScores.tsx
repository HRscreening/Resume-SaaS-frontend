import type { CallCategoryScore } from "@/types";

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
                    {data.score.toFixed(1)}
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