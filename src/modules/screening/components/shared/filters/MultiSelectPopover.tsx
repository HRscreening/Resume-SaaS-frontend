import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
  dot?: string;
}

interface MultiSelectPopoverProps {
  label: string;
  options: ReadonlyArray<Option>;
  value: string[] | undefined;
  onChange: (next: string[]) => void;
  // Optional icon rendered to the left of the label inside the trigger.
  icon?: React.ReactNode;
  emptyHint?: string;
}

// Generic multi-select dropdown shared by Stage and Match.
// Now built on shadcn DropdownMenu + Checkbox, styled to match
// ExperienceRangeSelector (rounded-lg trigger, tan "active" state).
export function MultiSelectPopover({
  label,
  options,
  value,
  onChange,
  icon,
  emptyHint = "No options",
}: MultiSelectPopoverProps) {
  const [open, setOpen] = useState(false);
  const selected = value ?? [];
  const count = selected.length;
  const isActive = count > 0;

  function toggle(v: string) {
    const set = new Set(selected);
    if (set.has(v)) set.delete(v);
    else set.add(v);
    onChange([...set]);
  }

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
        {icon && (
          <span className={isActive ? "text-[#C17A3D]" : "text-[#737373]"}>
            {icon}
          </span>
        )}
        <span>{label}</span>
        {count > 0 && (
          <span
            className="
                            flex items-center justify-center
                            h-4 min-w-4 px-1
                            rounded-full
                            text-[10px] font-semibold
                            bg-[#8A6D46] text-white
                        "
          >
            {count}
          </span>
        )}
        <ChevronDown
          size={14}
          className={`
                        transition-transform duration-200 ease-out
                        ${isActive ? "text-[#8A6D46]" : "text-[#A3A3A3]"}
                        ${open ? "rotate-180" : "rotate-0"}
                    `}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="
                    w-64
                    p-2
                    rounded-lg
                    border border-[#E5E5E5]
                    bg-white
                    shadow-lg
                "
        align="start"
        sideOffset={6}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="px-2 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
          {label}
        </div>

        <ul className="max-h-64 overflow-y-auto" role="listbox" aria-multiselectable>
          {options.length === 0 ? (
            <li className="px-2 py-1.5 text-xs text-[#A3A3A3]">{emptyHint}</li>
          ) : (
            options.map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <li key={opt.value}>
                  <label
                    className="
                                            w-full flex items-center gap-2
                                            px-2 py-1.5
                                            rounded-md
                                            hover:bg-[#F5F5F5]
                                            cursor-pointer
                                        "
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(opt.value)}
                      className="
                                                data-[state=checked]:bg-[#171717]
                                                data-[state=checked]:border-[#171717]
                                            "
                    />
                    {opt.dot && (
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: opt.dot }}
                      />
                    )}
                    <span className="text-sm text-[#262626] truncate">
                      {opt.label}
                    </span>
                  </label>
                </li>
              );
            })
          )}
        </ul>

        {count > 0 && (
          <div className="border-t border-[#E5E5E5] mt-1 pt-1">
            <button
              type="button"
              onClick={() => onChange([])}
              className="
                                w-full
                                px-2 py-1.5
                                rounded-md
                                text-xs font-medium text-[#737373]
                                hover:bg-[#F5F5F5]
                                text-left
                            "
            >
              Clear {label.toLowerCase()}
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}