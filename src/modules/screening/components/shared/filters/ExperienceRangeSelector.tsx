import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BriefcaseBusiness } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import {DEFAULT_MIN,DEFAULT_MAX,type  RangeFilter } from "@/modules/screening/types/searchSchema"


interface ExperienceRangeSelectorProps {
    setExperienceRange: (experience: RangeFilter ) => void;
    min?: number;
    max?: number;
    initialRange?: RangeFilter;
}


export default function ExperienceRangeSelector({
    setExperienceRange,
    min = DEFAULT_MIN,
    max = DEFAULT_MAX,
    initialRange,
}: ExperienceRangeSelectorProps) {
    const [open, setOpen] = useState(false);
    const [range, setRange] = useState<[number, number]>([
        initialRange?.min ?? min,
        initialRange?.max ?? max,
    ]);

    const isActive = range[0] !== min || range[1] !== max;

    const handleApply = () => {
        if (range[0] === min && range[1] === max) {
            setExperienceRange({ min, max });
        } else {
            setExperienceRange({ min: range[0], max: range[1] });
        }
        setOpen(false);
    };

    const handleClear = () => {
        setRange([min, max]);
        setExperienceRange({ min, max });
        setOpen(false);
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger
                className={`
                    h-9 px-3
                    rounded-lg
                    cursor-pointer
                    text-sm font-medium
                    flex items-center gap-2
                    whitespace-nowrap
                    outline-none
                    ${isActive
                        ? "text-[#8A6D46] bg-[#FBF1E4] border border-[#F0D9B5]"
                        : "text-[#404040]"
                    }
                `}
            >
                <BriefcaseBusiness
                    size={14}
                    className={isActive ? "text-[#C17A3D]" : "text-[#737373]"}
                />
                <span>
                    {isActive
                        ? `Experience: ${range[0]}–${range[1]} yrs`
                        : "Experience"}
                </span>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                className="
                    w-72
                    p-4
                    rounded-lg
                    border border-[#E5E5E5]
                    bg-white
                    shadow-lg
                "
                align="start"
                sideOffset={6}
                onCloseAutoFocus={(e) => e.preventDefault()}
            >
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-[#262626]">
                        Experience (yrs)
                    </span>
                    <span className="text-sm text-[#737373]">
                        {range[0]} – {range[1]}
                    </span>
                </div>

                <Slider
                    min={min}
                    max={max}
                    step={1}
                    value={range}
                    onValueChange={(value) =>
                        setRange([value[0], value[1]] as [number, number])
                    }
                    className="mb-2"
                />

                <div className="flex items-center justify-between text-xs text-[#A3A3A3] mb-4">
                    <span>{min}</span>
                    <span>{max}+</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={handleClear}
                        className="
                            h-8 px-2
                            rounded-md
                            text-sm text-[#737373]
                            hover:bg-[#F5F5F5]
                        "
                    >
                        Clear
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        className="
                            h-8 px-3
                            rounded-md
                            bg-[#171717]
                            text-sm font-medium text-white
                            hover:bg-[#262626]
                        "
                    >
                        Apply
                    </button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}