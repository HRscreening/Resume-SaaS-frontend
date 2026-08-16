import React from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ActionButtonProps {
    title: string;
    description?: string;
    onClick: () => void;
    compacted?: boolean;
    icon?: React.ReactNode;
    disabled?: boolean;
}



const ActionButton = ({title,description,icon,onClick,compacted = false,disabled=false}:ActionButtonProps) => {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={onClick}
                    disabled={disabled}
                    className={`h-9 ${compacted ? "px-2.5" : "px-4"} border border-[#D4D4D4] text-xs :text-sm font-medium text-[#404040] rounded-xl hover:bg-white transition-colors flex items-center gap-2 whitespace-nowrap`}
                >
                    {icon}
                    {!compacted && `${title}`}
                </button>
            </TooltipTrigger>
            {compacted && <TooltipContent><p className="text-xs">{description ?? title}</p></TooltipContent>}
        </Tooltip>
    )
}

export default ActionButton
