import { useEffect, useMemo, useRef, useState } from "react";
import {
  countryForDial,
  flagOf,
  searchCountries,
  toDialValue,
  type Country,
} from "@/lib/countries";

interface CountryCodeSelectProps {
  /** Stored E.164 prefix, e.g. "+91". */
  value: string;
  onChange: (next: string) => void;
  id?: string;
  className?: string;
}

/**
 * Searchable country dial-code picker.
 *
 * A plain text input let a recruiter type "91" or "0091" or "+9 1" and only
 * find out it was wrong when a call failed to dial. This constrains the value
 * to real codes while staying fast for the common case: the list opens with
 * India pinned on top, and one keystroke narrows it.
 *
 * Search accepts either half of what the user knows — a name ("germ") or a code
 * ("49") — because people reach for whichever they remember. The rules live in
 * lib/countries so they can be reasoned about apart from this rendering.
 */
export function CountryCodeSelect({ value, onChange, id, className = "" }: CountryCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = countryForDial(value);
  const results = useMemo(() => searchCountries(query), [query]);

  // Close on outside click and on Escape — a dropdown that traps you is worse
  // than one that occasionally closes early.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setQuery("");
  }, [open]);

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({
      block: "nearest",
    });
  }, [active, open]);

  useEffect(() => setActive(0), [query]);

  const commit = (c: Country) => {
    onChange(toDialValue(c));
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!results.length) return;
      setActive((i) =>
        e.key === "ArrowDown" ? (i + 1) % results.length : (i - 1 + results.length) % results.length,
      );
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[active];
      if (pick) commit(pick);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full items-center gap-2 rounded-xl border border-[#D4D4D4] bg-white px-3 text-left text-sm text-[#0F0F0F] transition-colors hover:border-[#0F0F0F]/40 focus:border-[#0F0F0F] focus:outline-none"
      >
        {selected ? (
          <>
            <span aria-hidden="true">{flagOf(selected.iso)}</span>
            <span className="font-medium tabular-nums">{toDialValue(selected)}</span>
            <span className="min-w-0 flex-1 truncate text-[#737373]">{selected.name}</span>
          </>
        ) : (
          // An unrecognised stored value is shown as-is rather than silently
          // corrected: it may be a code this list does not carry yet.
          <span className="min-w-0 flex-1 truncate text-[#737373]">
            {value || "Select country code"}
          </span>
        )}
        <svg
          width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round"
          className={`shrink-0 text-[#A3A3A3] transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 5l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-[#D4D4D4] bg-white shadow-lg">
          <div className="border-b border-[#E8E5DF] p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search country or code"
              aria-label="Search country or dial code"
              className="h-8 w-full rounded-lg border border-[#E8E5DF] px-2.5 text-sm text-[#0F0F0F] placeholder:text-[#A3A3A3] focus:border-[#0F0F0F] focus:outline-none"
            />
          </div>
          <ul ref={listRef} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {results.map((c, i) => {
              const isSelected = selected?.iso === c.iso;
              return (
                <li key={c.iso} data-idx={i}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => commit(c)}
                    className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors ${
                      i === active ? "bg-[#F5F3EE]" : ""
                    } ${isSelected ? "font-medium text-[#0F0F0F]" : "text-[#404040]"}`}
                  >
                    <span aria-hidden="true">{flagOf(c.iso)}</span>
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="shrink-0 tabular-nums text-[#737373]">+{c.dial}</span>
                  </button>
                </li>
              );
            })}
            {results.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-[#737373]">
                No country matches &ldquo;{query}&rdquo;.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
