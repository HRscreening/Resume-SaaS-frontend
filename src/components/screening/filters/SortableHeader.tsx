import type { ReactNode } from "react";
import type { SortField, SortRule } from "@/types";

// Derives the per-column sort indicator (direction + rank) from the current
// multi-sort list. Lives here because <SortableHeader> is the only consumer
// now that the toolbar Sort button is gone.
export function getSortIndicator(sort: SortRule[], field: SortField): {
  direction: "asc" | "desc" | null;
  rank: number | null;
} {
  const idx = sort.findIndex((r) => r.field === field);
  if (idx === -1) return { direction: null, rank: null };
  return { direction: sort[idx].direction, rank: idx + 1 };
}

interface SortableHeaderProps {
  field: SortField;
  sort: SortRule[];
  onChange: (next: SortRule[]) => void;
  children: ReactNode;
  // Pass-through for column-specific Tailwind classes (alignment, sticky).
  className?: string;
  align?: "left" | "center" | "right";
  // Optional secondary line rendered below the title row. Useful for
  // category columns that show "/ 10 · 30%" beneath the name. Renders
  // outside the truncating span so it doesn't get clipped.
  subtitle?: ReactNode;
}

// <th> wrapper that toggles its column's sort on click and supports
// shift-click to add as a secondary sort key.
// Click semantics (matching Linear / Notion):
//   click          → make this the only sort key, asc → desc → off
//   shift-click    → add this key to the end of the sort list, same cycle
export function SortableHeader({
  field,
  sort,
  onChange,
  children,
  className = "",
  align = "left",
  subtitle,
}: SortableHeaderProps) {
  const indicator = getSortIndicator(sort, field);

  function nextDirection(current: "asc" | "desc" | null): "asc" | "desc" | null {
    if (current === null) return "desc";
    if (current === "desc") return "asc";
    return null;
  }

  function handleClick(e: React.MouseEvent) {
    const dir = nextDirection(indicator.direction);
    if (e.shiftKey) {
      const others = sort.filter((r) => r.field !== field);
      onChange(dir === null ? others : [...others, { field, direction: dir }]);
    } else {
      onChange(dir === null ? [] : [{ field, direction: dir }]);
    }
  }

  const alignCls = align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";

  return (
    <th className={className}>
      <button
        type="button"
        onClick={handleClick}
        title="Click to sort · Shift+Click to add as secondary"
        className={`group w-full min-w-0 flex items-center gap-1 ${alignCls} text-[11px] font-semibold uppercase tracking-wide text-[#737373] hover:text-[#0F0F0F] transition-colors cursor-pointer`}
      >
        {/* Indicator leads the label (Google Search Console pattern). On
            inactive columns the slot stays empty / hover-only so the
            header bar reads quietly. */}
        <SortIcon direction={indicator.direction} rank={indicator.rank} multi={sort.length > 1} />
        {/* `min-w-0` is load-bearing: flex children won't shrink below their
            intrinsic content width without it, which is why long category
            names ("Technical Skills & Expertise") used to overflow into
            the next column. */}
        <span className="min-w-0 truncate">{children}</span>
      </button>
      {subtitle != null && (
        <div className={`mt-0.5 text-[10px] font-normal text-[#BDB8AE] normal-case tracking-normal ${alignCls === "justify-center" ? "text-center" : alignCls === "justify-end" ? "text-right" : "text-left"}`}>
          {subtitle}
        </div>
      )}
    </th>
  );
}

function SortIcon({
  direction,
  rank,
  multi,
}: {
  direction: "asc" | "desc" | null;
  rank: number | null;
  multi: boolean;
}) {
  // Inactive: faint downward arrow that only emerges on column hover.
  // Keeps the header bar visually quiet when nothing is sorted while still
  // signalling that the column is clickable.
  if (direction === null) {
    return (
      <span className="opacity-0 group-hover:opacity-50 transition-opacity text-[#737373]">
        <Arrow direction="desc" />
      </span>
    );
  }
  // Active: pill-shaped chip wrapping the directional arrow, in the brand
  // orange so the active sort stands out at a glance. Multi-sort rank
  // renders as a small number inside the same pill.
  return (
    <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-[#FBF1E7] border border-[#F0DCC4] text-[#C85A17]">
      <Arrow direction={direction} />
      {multi && rank !== null && (
        <span className="text-[9px] font-bold leading-none">{rank}</span>
      )}
    </span>
  );
}

function Arrow({ direction }: { direction: "asc" | "desc" }) {
  return (
    <svg
      width="11" height="11" viewBox="0 0 12 12"
      fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    >
      {direction === "desc" ? (
        // ↓
        <>
          <path d="M6 2v8" />
          <path d="M3 7l3 3 3-3" />
        </>
      ) : (
        // ↑
        <>
          <path d="M6 10V2" />
          <path d="M3 5l3-3 3 3" />
        </>
      )}
    </svg>
  );
}
