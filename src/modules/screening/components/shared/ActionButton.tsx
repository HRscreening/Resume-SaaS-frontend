import React from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ActionButtonProps {
    title: string;
    description?: string;
    onClick: () => void;
    compacted?: boolean;
    icon?: React.ReactNode;
    disabled?: boolean;
    isLoading?: boolean;
}

export const ActionButton = ({
    title,
    description,
    icon,
    onClick,
    isLoading = false,
    compacted = false,
    disabled = false,
}: ActionButtonProps) => {


    return (
        <Tooltip
        >
            <TooltipTrigger asChild>
                <button
                    onClick={onClick}
                    disabled={disabled || isLoading}
                    className={`h-9 ${compacted ? "px-2.5" : "px-4"
                        } cursor-pointer border border-[#D4D4D4] text-xs font-medium text-[#404040] rounded-xl hover:bg-white transition-colors flex items-center gap-2 whitespace-nowrap`}
                >
                    {isLoading ? (
                        <svg
                            className="animate-spin h-4 w-4 text-[#404040]"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                    ) : (
                        icon
                    )}

                    {!compacted && title}
                </button>
            </TooltipTrigger>

            {compacted && (
                <TooltipContent
                    autoFocus={false}
                >
                    <p className="text-xs">{description ?? title}</p>
                </TooltipContent>
            )}
        </Tooltip>
    );
};