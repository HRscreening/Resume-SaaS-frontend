import { Popover } from "./Popover";

interface Option {
  value: string;
  label: string;
  dot?: string;
}

interface MultiSelectPopoverProps {
  label: string;
  options: ReadonlyArray<Option>;
  value: string[];
  onChange: (next: string[]) => void;
  // Optional icon rendered to the left of the label inside the trigger.
  icon?: React.ReactNode;
  emptyHint?: string;
}

// Generic multi-select dropdown shared by Stage and Match. Trigger shows
// "Label" with a count badge when selections exist; panel shows a list of
// checkbox rows with optional color dots.
export function MultiSelectPopover({
  label,
  options,
  value,
  onChange,
  icon,
  emptyHint = "No options",
}: MultiSelectPopoverProps) {
  function toggle(v: string) {
    const set = new Set(value);
    if (set.has(v)) set.delete(v);
    else set.add(v);
    onChange([...set]);
  }

  const count = value.length;

  return (
    <Popover
      className="min-w-[220px]"
      trigger={({ open, toggle: t, ref }) => (
        <button
          ref={ref}
          type="button"
          onClick={t}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={`h-9 px-3 border text-sm font-medium rounded-xl transition-colors flex items-center gap-2 ${
            count > 0 || open
              ? "border-[#0F0F0F] bg-[#0F0F0F] text-white"
              : "border-[#D4D4D4] text-[#404040] bg-white hover:bg-[#F5F3EE]"
          }`}
        >
          {icon}
          <span>{label}</span>
          {count > 0 && (
            <span
              className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
                count > 0 ? "bg-white text-[#0F0F0F]" : "bg-[#0F0F0F] text-white"
              }`}
            >
              {count}
            </span>
          )}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 4l2.5 2.5L7.5 4" />
          </svg>
        </button>
      )}
    >
      <div className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[#A0A0A0]">
        {label}
      </div>
      <ul className="max-h-64 overflow-y-auto px-1 pb-1" role="listbox" aria-multiselectable>
        {options.length === 0 ? (
          <li className="px-2 py-1.5 text-xs text-[#A0A0A0]">{emptyHint}</li>
        ) : (
          options.map((opt) => {
            const checked = value.includes(opt.value);
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={checked}
                  onClick={() => toggle(opt.value)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#F5F3EE] transition-colors text-left"
                >
                  <span
                    className={`h-4 w-4 rounded-[4px] border flex items-center justify-center shrink-0 ${
                      checked ? "border-[#C85A17] bg-[#C85A17]" : "border-[#D4D4D4] bg-white"
                    }`}
                  >
                    {checked && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 5l2 2 4-4" />
                      </svg>
                    )}
                  </span>
                  {opt.dot && (
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: opt.dot }} />
                  )}
                  <span className="text-sm text-[#0F0F0F] truncate">{opt.label}</span>
                </button>
              </li>
            );
          })
        )}
      </ul>
      {count > 0 && (
        <div className="border-t border-[#E8E5DF]">
          <button
            type="button"
            onClick={() => onChange([])}
            className="w-full px-3 py-1.5 text-xs font-medium text-[#404040] hover:bg-[#F5F3EE] text-left"
          >
            Clear {label.toLowerCase()}
          </button>
        </div>
      )}
    </Popover>
  );
}
