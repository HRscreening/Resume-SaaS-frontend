import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { SidebarInner } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

/**
 * Mobile top app bar with hamburger drawer. Renders below `md` only;
 * the desktop sticky `Sidebar` takes over at `md` and up.
 *
 * Layout responsibilities:
 *   - h-14 fixed top bar so `<main>` content is reachable below it
 *   - Hamburger button toggles a slide-in drawer from the left (256 px wide)
 *   - Backdrop overlay closes the drawer on tap
 *   - Drawer auto-closes on route change, Escape key, or any Link inside
 *     `SidebarInner` (via the onNavigate prop)
 *   - Locks body scroll while open so the page underneath doesn't move
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close whenever the route changes — covers Link clicks inside the
  // drawer as well as programmatic navigations (e.g. logout → /login).
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Esc to close. Defensive: also runs while closed but the early-return
  // keeps it cheap.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      {/* Top app bar — fixed so it stays visible during page scroll. */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center justify-between px-4 bg-white border-b border-[#E8E5DF]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="h-10 w-10 -ml-2 flex items-center justify-center rounded-lg text-[#0F0F0F] hover:bg-[#F5F3EE] active:bg-[#EAE7DF] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <path d="M3 6h14M3 10h14M3 14h14" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="HireSort logo" className="h-6 w-auto" />
          <span className="font-semibold text-[#0F0F0F] text-sm">HireSort</span>
        </div>

        {/* Spacer to balance the hamburger so the logo stays centred. */}
        <span className="h-10 w-10" aria-hidden="true" />
      </header>

      {/* Backdrop — fades in/out behind the drawer. */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={cn(
          "md:hidden fixed inset-0 z-40 bg-black/40 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />

      {/* Drawer panel — slides in from the left. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "md:hidden fixed top-0 left-0 z-50 h-full w-[280px] max-w-[85vw] bg-white border-r border-[#E8E5DF] shadow-xl",
          "transform transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarInner onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}
