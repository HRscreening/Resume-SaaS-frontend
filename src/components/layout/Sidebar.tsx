import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { clearAuthCache } from "@/lib/auth";
import { getUsage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { SubscriptionPlan } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

const HomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1.5 6.5L8 1.5l6.5 5V14a.5.5 0 0 1-.5.5H10V10H6v4.5H2a.5.5 0 0 1-.5-.5V6.5Z"/>
  </svg>
);

const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4h12M2 8h12M2 12h8"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2v12M2 8h12"/>
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="6" r="3"/>
    <circle cx="8" cy="8" r="6.5"/>
  </svg>
);

const StarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 1.5l1.4 3.7c.2.4.5.7.9.9L14 7.5l-3.7 1.4c-.4.2-.7.5-.9.9L8 13.5l-1.4-3.7c-.2-.4-.5-.7-.9-.9L2 7.5l3.7-1.4c.4-.2.7-.5.9-.9L8 1.5z"/>
  </svg>
);

const GearIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="2.2"/>
    <path d="M13 9.4a1 1 0 0 0 .2 1.1l.04.04a1.2 1.2 0 1 1-1.7 1.7l-.04-.04a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V13a1.2 1.2 0 1 1-2.4 0v-.06a1 1 0 0 0-.66-.92 1 1 0 0 0-1.1.2l-.04.04A1.2 1.2 0 1 1 3.86 10.56l.04-.04a1 1 0 0 0 .2-1.1 1 1 0 0 0-.92-.6H3a1.2 1.2 0 1 1 0-2.4h.06a1 1 0 0 0 .92-.66 1 1 0 0 0-.2-1.1l-.04-.04A1.2 1.2 0 1 1 5.44 2.94l.04.04a1 1 0 0 0 1.1.2H6.6a1 1 0 0 0 .6-.92V2.2a1.2 1.2 0 1 1 2.4 0v.06a1 1 0 0 0 .6.92 1 1 0 0 0 1.1-.2l.04-.04a1.2 1.2 0 1 1 1.7 1.7l-.04.04a1 1 0 0 0-.2 1.1V5.94a1 1 0 0 0 .92.6H14a1.2 1.2 0 1 1 0 2.4h-.06a1 1 0 0 0-.92.6z"/>
  </svg>
);

const HelpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6.5"/>
    <path d="M6.3 6a1.7 1.7 0 0 1 3.3.5c0 1-1.6 1.5-1.6 1.5"/>
    <circle cx="8" cy="11" r="0.4" fill="currentColor"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M11 11l3-3-3-3M14 8H6"/>
  </svg>
);

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 3l4 4-4 4"/>
  </svg>
);

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <HomeIcon />, exact: true },
  { href: "/screenings", label: "Jobs", icon: <ListIcon /> },
  { href: "/screenings/new", label: "New Job", icon: <PlusIcon />, exact: true },
];

const PLAN_LABEL: Record<SubscriptionPlan, string> = {
  FREE: "Free",
  PRO: "Starter",
  BUSINESS: "Growth",
  ENTERPRISE: "Scale",
};

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

export function Sidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const { data: usage } = useQuery({
    queryKey: ["usage"],
    queryFn: getUsage,
    staleTime: 60_000,
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? null);
        const meta = data.user.user_metadata;
        setDisplayName(meta?.full_name ?? meta?.name ?? null);
      }
    });
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    setMenuOpen(false);
    clearAuthCache();
    const supabase = createClient();
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    const exactMatch = navItems.find((n) => n.exact && n.href !== item.href && pathname === n.href);
    if (exactMatch) return false;
    return pathname.startsWith(item.href);
  }

  const initials = getInitials(displayName, email);
  const planLabel = usage ? PLAN_LABEL[usage.plan] : null;
  const used = usage?.resumes_processed ?? 0;
  const limit = usage?.quota_limit ?? 0;
  const usedPct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isFree = usage?.plan === "FREE";

  return (
    <aside className="w-[220px] h-full flex flex-col bg-white border-r border-[#E8E5DF] shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-[#E8E5DF]">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 bg-[#0F0F0F] rounded-md flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold leading-none">HS</span>
          </div>
          <span className="font-semibold text-[#0F0F0F] text-sm">HireSort</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5" aria-label="Sidebar navigation">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-[#0F0F0F] text-white"
                  : "text-[#404040] hover:bg-[#F5F3EE] hover:text-[#0F0F0F]",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className={cn(active ? "text-white" : "text-[#737373]")}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User trigger + popup */}
      <div ref={menuRef} className="relative border-t border-[#E8E5DF] p-2">

        {/* Popup menu — opens upward, anchored to the trigger */}
        {menuOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-1.5 bg-white rounded-2xl border border-[#E8E5DF] shadow-lg overflow-hidden z-50">
            {/* Identity card — clickable, navigates to profile */}
            <Link
              to="/settings"
              hash="profile"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#F5F3EE] transition-colors"
            >
              <div className="h-9 w-9 rounded-full bg-[#0F0F0F] flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-semibold leading-none">{initials}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#0F0F0F] truncate leading-tight">
                  {displayName ?? email ?? "—"}
                </p>
                {planLabel && (
                  <p className="text-xs text-[#737373] truncate leading-tight mt-0.5">
                    {planLabel}
                  </p>
                )}
              </div>
              <span className="text-[#A0A0A0] shrink-0">
                <ChevronRight />
              </span>
            </Link>

            {/* Usage progress (HireSort-specific) */}
            {usage && limit > 0 && (
              <div className="px-4 pb-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#737373]">Resumes this month</span>
                  <span className="font-semibold text-[#0F0F0F] tabular-nums">{used} / {limit}</span>
                </div>
                <div className="h-1.5 w-full bg-[#F0EDE8] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      usedPct >= 90 ? "bg-red-500" : usedPct >= 70 ? "bg-amber-500" : "bg-[#0F0F0F]",
                    )}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
              </div>
            )}

            <div className="h-px bg-[#E8E5DF]" />

            <div className="py-1.5">
              <Link
                to="/settings"
                hash="billing"
                className="flex items-center justify-between gap-3 px-4 py-2 text-sm text-[#404040] hover:bg-[#F5F3EE] transition-colors"
              >
                <span className="flex items-center gap-3">
                  <StarIcon />
                  Upgrade plan
                </span>
                {isFree && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                    New
                  </span>
                )}
              </Link>
              <Link
                to="/settings"
                hash="profile"
                className="flex items-center gap-3 px-4 py-2 text-sm text-[#404040] hover:bg-[#F5F3EE] transition-colors"
              >
                <UserIcon />
                Profile
              </Link>
              <Link
                to="/settings"
                className="flex items-center gap-3 px-4 py-2 text-sm text-[#404040] hover:bg-[#F5F3EE] transition-colors"
              >
                <GearIcon />
                Settings
              </Link>
            </div>

            <div className="h-px bg-[#E8E5DF]" />

            <div className="py-1.5">
              <a
                href="https://hiresort.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2 text-sm text-[#404040] hover:bg-[#F5F3EE] transition-colors"
              >
                <HelpIcon />
                Help
              </a>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#404040] hover:bg-[#F5F3EE] transition-colors disabled:opacity-50"
              >
                <LogoutIcon />
                {loggingOut ? "Signing out…" : "Log out"}
              </button>
            </div>
          </div>
        )}

        {/* Trigger button — bottom-pinned identity card */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors text-left",
            menuOpen ? "bg-[#F0EDE8]" : "hover:bg-[#F5F3EE]",
          )}
        >
          <div className="h-8 w-8 rounded-full bg-[#0F0F0F] flex items-center justify-center shrink-0 select-none">
            <span className="text-white text-xs font-semibold leading-none">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#0F0F0F] truncate leading-tight">
              {displayName ?? email ?? "—"}
            </p>
            {planLabel && (
              <p className="text-[11px] text-[#737373] truncate leading-tight mt-0.5">
                {planLabel}
              </p>
            )}
          </div>
        </button>
      </div>
    </aside>
  );
}

export default function SidebarDefault() {
  return <Sidebar />;
}
