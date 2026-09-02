import {
    type LucideIcon,
} from 'lucide-react'
import LoadingSpinner from '@/modules/screening/components/shared/LoadingSpinner'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"


interface UtilityButtonProps {
    title: string;
    onClick: () => void;
    disabled?: boolean;
    isLoading?: boolean;
    className?: string;
    Icon?: LucideIcon;
    variant?: "default" | "primary" | "ghost" | "danger";
    compact?: boolean;
}

const VARIANT_STYLES: Record<NonNullable<UtilityButtonProps["variant"]>, string> = {
    default:
        "border border-[#D9D6CE] bg-white text-[#3A3A3A] hover:bg-[#F5F3EE] hover:border-[#C9C5BA]",
    primary:
        "border border-[#0F0F0F] bg-[#0F0F0F] text-white hover:bg-[#262626]",
    ghost:
        "border border-transparent bg-transparent text-[#595959] hover:bg-[#F0EEE8]",
    danger:
        "border border-[#F2D6D6] bg-white text-[#C4372B] hover:bg-[#FBEEEE] hover:border-[#E8B8B8]",
};

export function UtilityButton({
    title,
    onClick,
    disabled = false,
    isLoading = false,
    className = "",
    Icon,
    variant = "default",
    compact = false,
}: UtilityButtonProps) {
    // icon-only compact form needs an icon to render meaningfully; fall back to
    // showing the label if no icon was passed (e.g. Export without one)
    const iconOnly = compact && !!Icon;

    const button = (
        <button
            onClick={onClick}
            disabled={disabled || isLoading}
            aria-label={title}
            className={`
        inline-flex items-center justify-center gap-1.5
        h-9 rounded-xl
        text-sm font-medium
        transition-colors
        cursor-pointer whitespace-nowrap
        ${iconOnly ? "w-9 px-0" : "px-3.5"}
        ${VARIANT_STYLES[variant]}
        ${className}
        ${disabled || isLoading ? "opacity-50 cursor-not-allowed hover:bg-transparent" : ""}
      `}
        >
            {isLoading ? (
                <LoadingSpinner />
            ) : (
                Icon && <Icon className="w-4 h-4" />
            )}
            {!iconOnly && title}
        </button>
    )

    if (!iconOnly) return button;

    return (
        <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="top">
                <p>{title}</p>
            </TooltipContent>
        </Tooltip>
    )
}

