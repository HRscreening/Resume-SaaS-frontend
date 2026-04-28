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
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="5.5" r="2.5"/>
    <path d="M2.5 13.5c.8-2.4 3-3.5 5.5-3.5s4.7 1.1 5.5 3.5"/>
  </svg>
);

const StarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 1.5l1.9 4.1 4.5.5-3.4 3 1 4.4L8 11.3 4 13.5l1-4.4-3.4-3 4.5-.5L8 1.5z"/>
  </svg>
);

const CardIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="3.5" width="13" height="9" rx="1.5"/>
    <path d="M1.5 6.5h13"/>
  </svg>
);

const GearIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="2.5"/>
    <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.3 3.3l.7.7M12 12l.7.7M12 3.3l-.7.7M3.3 12.7l.7-.7"/>
  </svg>
);

const ExternalIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2.5h4v4M13.5 2.5L7 9M6 3.5H3a1 1 0 0 0-1 1V13a1 1 0 0 0 1 1h8.5a1 1 0 0 0 1-1V10"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M11 11l3-3-3-3M14 8H6"/>
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

        {/* Popup menu — appears above the trigger */}
        {menuOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-1.5 bg-white rounded-2xl border border-[#E8E5DF] shadow-lg overflow-hidden z-50">
            {/* Identity card */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#C85A17] flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-semibold leading-none">{initials}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#0F0F0F] truncate leading-tight">
                    {displayName ?? "—"}
                  </p>
                  <p className="text-xs text-[#737373] truncate leading-tight mt-0.5">
                    {email ?? ""}
                  </p>
                </div>
              </div>
              {planLabel && (
                <span className="inline-block mt-2 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#F0EDE8] text-[#404040] border border-[#E8E5DF]">
                  {planLabel}
                </span>
              )}
            </div>

            {/* Usage progress */}
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

            {/* ACCOUNT section */}
            <div className="py-2">
              <p className="px-4 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
                Account
              </p>
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
                hash="billing"
                className="flex items-center gap-3 px-4 py-2 text-sm text-[#404040] hover:bg-[#F5F3EE] transition-colors"
              >
                <CardIcon />
                Billing
              </Link>
            </div>

            <div className="h-px bg-[#E8E5DF]" />

            {/* WORKSPACE section */}
            <div className="py-2">
              <p className="px-4 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
                Workspace
              </p>
              <Link
                to="/settings"
                className="flex items-center gap-3 px-4 py-2 text-sm text-[#404040] hover:bg-[#F5F3EE] transition-colors"
              >
                <GearIcon />
                Settings
              </Link>
              <a
                href="https://hiresort.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2 text-sm text-[#404040] hover:bg-[#F5F3EE] transition-colors"
              >
                <ExternalIcon />
                Docs &amp; help
              </a>
            </div>

            <div className="h-px bg-[#E8E5DF]" />

            {/* Sign out */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <LogoutIcon />
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        )}

        {/* Trigger button */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors text-left",
            menuOpen ? "bg-[#F0EDE8]" : "hover:bg-[#F5F3EE]",
          )}
        >
          <div className="h-8 w-8 rounded-full bg-[#C85A17] flex items-center justify-center shrink-0 select-none">
            <span className="text-white text-xs font-semibold leading-none">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#0F0F0F] truncate leading-tight">
              {displayName ?? email ?? "—"}
            </p>
            <p className="text-[11px] text-[#737373] truncate leading-tight mt-0.5">
              {planLabel
                ? limit > 0
                  ? `${planLabel} plan · ${used}/${limit} used`
                  : `${planLabel} plan`
                : email ?? ""}
            </p>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            className={cn("text-[#A0A0A0] shrink-0 transition-transform", menuOpen && "rotate-180")}>
            <path d="M3 5l4 4 4-4"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}

export default function SidebarDefault() {
  return <Sidebar />;
}
