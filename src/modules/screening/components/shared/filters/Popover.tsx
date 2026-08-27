import { useEffect, useRef, useState, type ReactNode } from "react";

interface PopoverProps {
  // Renders the trigger; receives the toggle handler.
  trigger: (props: { open: boolean; toggle: () => void; ref: React.RefObject<HTMLButtonElement | null> }) => ReactNode;
  children: ReactNode;
  // Tailwind width / align class for the panel.
  className?: string;
  // Match StageSelect aesthetic: positioned below the trigger, left-aligned.
  align?: "start" | "end";
}

// Lightweight controlled-by-state popover, modelled after the dropdown
// pattern in StageSelect. Picks click-outside + Escape, no portal, no
// focus trap. Suits the recruiter-skim use case better than radix Dialog.
export function Popover({ trigger, children, className = "", align = "start" }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative inline-block">
      {trigger({ open, toggle: () => setOpen((v) => !v), ref: triggerRef })}
      {open && (
        <div
          ref={panelRef}
          onClick={(e) => e.stopPropagation()}
          className={`absolute z-40 top-full mt-1 rounded-xl border border-[#E8E5DF] bg-white shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
            align === "end" ? "right-0" : "left-0"
          } ${className}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
