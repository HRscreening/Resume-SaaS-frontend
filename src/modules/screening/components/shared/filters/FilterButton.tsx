import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export interface FilterButtonProps {
    label: string;
    value: string;
    initiallyOpen?: boolean;
    onChange: (value: string) => void;
    onRemove: () => void;
}

const DEBOUNCE_MS = 750;
const MAX_LABEL_LENGTH = 18;

export function FilterButton({
    label,
    value,
    onChange,
    onRemove,
    initiallyOpen = false,
}: FilterButtonProps) {
    const [open, setOpen] = useState(initiallyOpen);
    const [inputValue, setInputValue] = useState(value);

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const debouncedValue = useDebouncedValue(
        inputValue,
        DEBOUNCE_MS
    );

    /*
     * Keep local input synchronized with URL/query state.
     */
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    /*
     * Push value after debounce.
     */
    useEffect(() => {
        if (debouncedValue === value) {
            return;
        }

        onChange(debouncedValue);
    }, [debouncedValue, value, onChange]);

    /*
     * Focus input when the popover opens.
     */
    useEffect(() => {
        if (open) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [open]);

    /*
     * Collapse when clicking outside.
     */
    useEffect(() => {
        if (!open) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(
                    event.target as Node
                )
            ) {
                setOpen(false);
            }
        };

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };
    }, [open]);

    const displayValue =
        value.length > MAX_LABEL_LENGTH
            ? `${value.slice(0, MAX_LABEL_LENGTH)}…`
            : value;

    const handleRemove = () => {
        setInputValue("");
        onRemove();
        setOpen(false);
    };

    return (
        <div ref={containerRef} className="relative inline-block">
            {/* Closed state — pill chip, matches the Screening page filter chips */}
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="
                    group
                    inline-flex
                    items-center
                    gap-1.5
                    h-8
                    max-w-64
                    rounded-full
                    border
                    border-[#F0D9B5]
                    bg-[#FBF1E4]
                    pl-3
                    pr-2
                    text-sm
                    transition-colors
                    hover:bg-[#F7E8D4]
                    hover:border-[#E8C695]
                "
            >
                <span className="text-[#8A6D46] whitespace-nowrap">
                    {label}
                    {value && ":"}
                </span>

                {value && (
                    <span
                        className="text-[#3A2E1F] font-medium truncate"
                        title={value}
                    >
                        {displayValue}
                    </span>
                )}

                <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRemove();
                    }}
                    className="
                        ml-0.5
                        flex
                        items-center
                        justify-center
                        w-4
                        h-4
                        rounded-full
                        text-[#C17A3D]
                        hover:text-white
                        hover:bg-[#C17A3D]
                        shrink-0
                        transition-colors
                    "
                >
                    <X size={11} strokeWidth={2.5} />
                </span>
            </button>

            {/* Notion-style popover — just the input, nothing else */}
            {open && (
                <div
                    className="
                        absolute
                        top-full
                        left-0
                        mt-1.5
                        z-50
                        rounded-lg
                        border
                        border-[#E8E5DF]
                        bg-white
                        shadow-lg
                        p-1.5
                    "
                >
                    <Input
                        ref={inputRef}
                        value={inputValue}
                        maxLength={50}
                        onChange={(e) =>
                            setInputValue(e.target.value)
                        }
                        autoFocus={open}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") {
                                setOpen(false);
                            }
                            if (e.key === "Enter") {
                                setOpen(false);
                            }
                        }}
                        className="
                            h-8
                            w-48
                            border-0
                            shadow-none
                            focus-visible:ring-1
                            focus-visible:ring-[#E8C695]
                            px-2
                        "
                        placeholder={`Filter ${label.toLowerCase()}...`}
                    />
                </div>
            )}
        </div>
    );
}


