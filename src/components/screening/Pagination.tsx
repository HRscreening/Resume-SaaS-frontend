interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  // Hover-prefetch hook — parent fires its results query for `page` so the
  // click lands on warm cache. No-op if omitted.
  onPrefetchPage?: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, total, pageSize, onChange, onPrefetchPage }: PaginationProps) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  const pages: (number | "…")[] = [];
  const push = (p: number | "…") => pages.push(p);
  const window = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  let last: number | null = null;
  for (let i = 1; i <= totalPages; i++) {
    if (window.has(i) && i >= 1 && i <= totalPages) {
      if (last !== null && i - last > 1) push("…");
      push(i);
      last = i;
    }
  }

  const btnBase =
    "h-9 min-w-9 px-3 rounded-xl border text-sm font-medium transition-colors flex items-center justify-center";
  const btnIdle =
    "border-[#E8E5DF] bg-white text-[#404040] hover:bg-[#F5F3EE]";
  const btnActive =
    "border-[#0F0F0F] bg-[#0F0F0F] text-white";
  const btnDisabled =
    "border-[#E8E5DF] bg-white text-[#D4D4D4] cursor-not-allowed";

  return (
    <div className="flex items-center justify-between w-full px-1 pt-1">
      <p className="text-xs text-[#737373]">
        Showing <span className="font-semibold text-[#404040]">{start}</span>–<span className="font-semibold text-[#404040]">{end}</span> of <span className="font-semibold text-[#404040]">{total}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(currentPage - 1)}
          onMouseEnter={() => currentPage > 1 && onPrefetchPage?.(currentPage - 1)}
          onFocus={() => currentPage > 1 && onPrefetchPage?.(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`${btnBase} ${currentPage <= 1 ? btnDisabled : btnIdle}`}
          aria-label="Previous page"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 2.5L4 6l3.5 3.5"/></svg>
        </button>
        {pages.map((p, idx) =>
          p === "…" ? (
            <span key={`gap-${idx}`} className="px-1 text-xs text-[#A0A0A0]">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              onMouseEnter={() => p !== currentPage && onPrefetchPage?.(p)}
              onFocus={() => p !== currentPage && onPrefetchPage?.(p)}
              className={`${btnBase} ${p === currentPage ? btnActive : btnIdle}`}
              aria-current={p === currentPage ? "page" : undefined}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onChange(currentPage + 1)}
          onMouseEnter={() => currentPage < totalPages && onPrefetchPage?.(currentPage + 1)}
          onFocus={() => currentPage < totalPages && onPrefetchPage?.(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`${btnBase} ${currentPage >= totalPages ? btnDisabled : btnIdle}`}
          aria-label="Next page"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 2.5L8 6l-3.5 3.5"/></svg>
        </button>
      </div>
    </div>
  );
}
