import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SingleProgressBar } from "@/modules/screening/types/screening.type";

type ScoreProgressBarProps = {
    overall_score: number;
    items: SingleProgressBar[];
};


export default function ScoreProgressBar({
    items,
    overall_score,
}: ScoreProgressBarProps) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex flex-col items-center cursor-pointer">
                        <span className="text-base font-semibold text-[#0F0F0F] leading-none">
                            {Math.round(overall_score)}
                        </span>

                        <div className="mt-2 flex w-16 gap-1">
                            {items.map((item) => (
                                <div
                                    key={item.title}
                                    className="h-1.5 flex-1 rounded-full"
                                    style={{
                                        backgroundColor: item.color,
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </TooltipTrigger>

                <TooltipContent align="center" side="bottom">
                    <div className="space-y-1">
                        {items.map((item) => (
                            <div
                                key={item.title}
                                className="flex items-center justify-between gap-3 text-xs"
                            >
                                <div className="flex items-center gap-2">
                                    <span
                                        className="h-2 w-2 rounded-full"
                                        style={{
                                            backgroundColor: item.color,
                                        }}
                                    />
                                    <span>{item.title}</span>
                                </div>

                                <span className="font-medium">
                                    {item.value}
                                    <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">
                                        /10
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}