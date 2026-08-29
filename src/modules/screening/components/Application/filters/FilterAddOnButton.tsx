import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus } from "lucide-react"
import type { ApplicationFilterKey } from "@/modules/screening/types/searchSchema"
import { FILTER_OPTIONS } from "@/modules/screening/components/Application/filters/FilterUtils"


interface FilterButtonProps {
    align?: "start" | "center" | "end";
    AlreadyAppliedFilters?: ApplicationFilterKey[];
    handleFilterSelect?: (value: ApplicationFilterKey) => void
}

export function FilterAddOnButton({
    handleFilterSelect,
    AlreadyAppliedFilters = [],
    align = "start"
}: FilterButtonProps) {

    const FILTER_OPTIONS_AVAILABLE = FILTER_OPTIONS.filter((option) => !AlreadyAppliedFilters.includes(option.value))


    return (
        <DropdownMenu>



            <DropdownMenuTrigger
                className="
                    h-9 px-1
                    
                    rounded-lg
                    cursor-pointer
                    text-sm font-medium text-[#404040]
                    flex items-center gap-2
                    whitespace-nowrap
                    outline-none
                "
            >
                <Plus
                    size={14}
                    className="text-[#737373]"
                />
                <span>Filters</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="
                    w-44
                    p-1.5
                    rounded-lg
                    border border-[#E5E5E5]
                    bg-white
                    shadow-lg
                "
                align={align}
                sideOffset={6}
                onCloseAutoFocus={(event) => {
                    // Don't let Radix restore focus to the trigger — the newly
                    // opened FilterButton's input should keep focus instead.
                    event.preventDefault();
                }}
            >


                {
                    FILTER_OPTIONS_AVAILABLE.map((option) => (
                        <DropdownMenuItem
                            key={option.value}
                            className="
                                h-8
                                px-2
                                rounded-lg
                                text-sm text-[#404040]
                                cursor-pointer
                                outline-none
                                hover:bg-[#F5F3EE]
                            "
                            onClick={() => {
                                if (typeof handleFilterSelect === "function") {
                                    handleFilterSelect(option.value)
                                }
                            }}
                        >   <option.icon
                                size={14}
                                className="text-[#737373] mr-2"
                            />
                            {option.label}
                        </DropdownMenuItem>
                    ))
                }


            </DropdownMenuContent>
        </DropdownMenu>
    )
}

