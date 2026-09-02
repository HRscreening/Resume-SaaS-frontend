import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SingleProgressBar } from "@/modules/screening/types/screening.type";

type ProgressBarProps = {
    items: SingleProgressBar[];
};

export default function ProgressBar({ items }: ProgressBarProps) {
    const total = items.reduce((sum, item) => sum + item.value, 0);

    return (

            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex h-1.5 w-20 overflow-hidden rounded-full bg-muted cursor-pointer">
                        {items.map((item) => {
                            const width = total
                                ? (item.value / total) * 100
                                : 0;

                            return (
                                <div
                                    key={item.title}
                                    className="h-full"
                                    style={{
                                        width: `${width}%`,
                                        backgroundColor: item.color,
                                    }}
                                />
                            );
                        })}
                    </div>
                </TooltipTrigger>

                <TooltipContent align="center" side="bottom">
                    <div className="space-y-1">
                        {items.map((item) => (
                            <div
                                key={item.title}
                                className="flex items-center justify-between gap-4 text-xs"
                            >
                                <div className="flex items-center gap-2">
                                    <span
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: item.color }}
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
    );
}