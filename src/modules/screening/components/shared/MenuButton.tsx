
import { Button } from "@/components/ui/Button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EllipsisVertical, ChevronDown } from "lucide-react"

export interface Option {
    label: string
    icon: React.ReactNode
    onClick: (input: any) => void
}

interface MenuButtonProps {
    options?: Option[]
    data?: any

}

export function MenuButton({ options, data = null }: MenuButtonProps) {

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="px-2">
                <EllipsisVertical className="text-[#A0A0A0] hover:text-[#C85A17] cursor-pointer" size={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40" align="end">
                {options?.map((option, index) => (
                    <DropdownMenuItem
                        key={index}
                        onClick={() => { option.onClick(data) }}
                        className="cursor-pointer">
                        {option.icon}
                        <span className="ml-2">{option.label}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

interface extendedMenuButtonProps {
    selectedOption: string
    options: { label: string, icon: React.ReactNode }[]
    handleOptionClick: (option: string) => void
    align?: "start" | "center" | "end"
}


// export function CustomMenuButton({
//     selectedOption,
//     options,
//     handleOptionClick,
//     align = "center"
// }: extendedMenuButtonProps) {
//     return (
//         <DropdownMenu>
//             <DropdownMenuTrigger
//                 className="
//                     h-9 px-3
//                     border border-[#D4D4D4]
//                     bg-white
//                     rounded-lg
//                     cursor-pointer
//                     text-sm font-medium text-[#404040]
//                     hover:bg-[#FAFAFA]
//                     transition-colors
//                     flex items-center gap-2
//                     whitespace-nowrap
//                     outline-none
//                 "
//             >
//                 <span>{selectedOption}</span>
//                 <ChevronDown
//                     size={14}
//                     className="text-[#737373]"
//                 />
//             </DropdownMenuTrigger>

//             <DropdownMenuContent
//                 className="
//                     w-44
//                     p-1.5
//                     rounded-lg
//                     border border-[#E5E5E5]
//                     bg-white
//                     shadow-lg
//                 "
//                 align={align}
//                 sideOffset={6}
//             >
//                 {options?.map((option) => {
//                     const isSelected =
//                         option.label === selectedOption

//                     return (
//                         <DropdownMenuItem
//                             key={option.label}
//                             onClick={() => handleOptionClick(option.label)}
//                             className={`
//                                 h-9
//                                 px-2.5
//                                 rounded-md
//                                 cursor-pointer
//                                 text-sm
//                                 flex items-center gap-2
//                                 outline-none
//                                 transition-colors

//                                 ${isSelected
//                                     ? "bg-[#FFF3EA] text-[#C85A17] font-medium"
//                                     : "text-[#404040] hover:bg-[#F5F5F5]"
//                                 }

//                                 ${option.label === "Delete"
//                                     ? "text-[#525252] hover:bg-red-50 hover:text-red-600"
//                                     : ""
//                                 }
//                             `}
//                         >
//                             {option.icon}

//                             <span>
//                                 {option.label}
//                             </span>
//                         </DropdownMenuItem>
//                     )
//                 })}
//             </DropdownMenuContent>
//         </DropdownMenu>
//     )
// }

import { useState } from "react"

interface extendedMenuButtonProps {
    selectedOption: string
    options: { label: string, icon: React.ReactNode }[]
    handleOptionClick: (option: string) => void
    align?: "start" | "center" | "end"
    isActive?: boolean
}
export function CustomMenuButton({
    selectedOption,
    options,
    handleOptionClick,
    align = "center",
    isActive = false
}: extendedMenuButtonProps) {
    const [open, setOpen] = useState(false);
 
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
                    border border-[#D4D4D4]
                    ${isActive
                        ? "text-[#8A6D46] bg-[#FBF1E4] border border-[#F0D9B5]"
                        : "text-[#404040]"
                    }
                `}
            >
                <span>{selectedOption}</span>
                <ChevronDown
                    size={14}
                    className={`
                        transition-transform duration-200 ease-out
                        ${isActive ? "text-[#C17A3D]" : "text-[#737373]"}
                        ${open ? "rotate-180" : "rotate-0"}
                    `}
                />
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
            >
                {options?.map((option) => {
                    const isSelected =
                        option.label === selectedOption
 
                    return (
                        <DropdownMenuItem
                            key={option.label}
                            onClick={() => handleOptionClick(option.label)}
                            className={`
                                h-9
                                px-2.5
                                rounded-md
                                cursor-pointer
                                text-sm
                                flex items-center gap-2
                                outline-none
                                transition-colors
 
                                ${isSelected
                                    ? "bg-[#FFF3EA] text-[#C85A17] font-medium"
                                    : "text-[#404040] hover:bg-[#F5F5F5]"
                                }
 
                                ${option.label === "Delete"
                                    ? "text-[#525252] hover:bg-red-50 hover:text-red-600"
                                    : ""
                                }
                            `}
                        >
                            {option.icon}
 
                            <span>
                                {option.label}
                            </span>
                        </DropdownMenuItem>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
 