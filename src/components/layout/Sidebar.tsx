import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { clearAuthCache } from "@/lib/auth";
import { getUsage, listScreenings } from "@/lib/api";
import { useUserKey, userKey } from "@/lib/userKey";
import { useAccount } from "@/hooks/useAccount";
import { useUsage } from "@/hooks/useUsage";
import { creditBalance } from "@/modules/subscription/credits";
import { useUserUsageQuotas } from "@/modules/subscription/useSubscription";
import { usedRatio } from "@/components/usage/QuotaMeter";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PLAN_LABEL } from "@/lib/planLabels";
import { User, Activity, BriefcaseBusiness, PanelLeft } from "lucide-react";

import { ChevronRight, GearIcon, HelpIcon, LogoutIcon, StarIcon, UserIcon, HomeIcon, ListIcon, PlusIcon } from "@/components/layout/sidebarIcons"


interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
  data_guide? : string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <HomeIcon />, exact: true },
  { href: "/screenings/new", label: "New Job", icon: <PlusIcon />, exact: true , data_guide: "new_jobs" },
  { href: "/screenings", label: "Jobs", icon: <BriefcaseBusiness size={18} /> , data_guide:"existing_jobs"},
  // { href: "/candidates", label: "Candidates", icon: <User size={14} />, exact: true },
];

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

/**
 * Stateful inner content — logo + nav items + user menu — shared between
 * the desktop sticky aside (`Sidebar`) and the mobile drawer (`MobileNav`).
 * `onNavigate` fires whenever a Link is clicked, so the mobile drawer can
 * close itself on route change without duplicating state.
 */
interface SidebarInnerProps {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const SIDEBAR_COLLAPSED_KEY = "hiresort:sidebar-collapsed";

export function SidebarInner({ onNavigate, collapsed = false, onToggleCollapsed }: SidebarInnerProps = {}) {
  const navigationId = useId();
  const accountMenuId = useId();
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { canWrite, ownerName, role } = useAccount();
  const { unlimited } = useUsage();


  const [displayName, setDisplayName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: quotaUsage, isPending: creditsLoading } = useUserUsageQuotas(menuOpen);
  const monthlyCredits = quotaUsage ? creditBalance(quotaUsage) : null;

  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);


  const { data: usage } = useQuery({
    queryKey: useUserKey("usage"),
    queryFn: getUsage,
    // Treat usage as always-stale so any invalidation OR mount triggers a fresh
    // fetch. The endpoint is small; the cost of an extra request is negligible
    // and prevents the counter from lagging the actual quota state.
    staleTime: 0,
    refetchOnWindowFocus: true,
    // Belt-and-suspenders: while ANY screening is mid-flight, poll usage every
    // 5s. This catches the case where an upload's invalidation is dropped (FE
    // navigation race, multi-tab, server hiccup) — the counter still ends up
    // correct without the user ever needing to refresh.
    refetchInterval: () => {
      // const screenings = queryClient.getQueryData<ScreeningListItem[]>(userKey("screenings"));
      // const anyInFlight = screenings?.some(
      //   (s) => s.status === "processing" || s.status === "pending",
      // );
      // return anyInFlight ? 5000 : false;
      return 1000 * 60 * 3; // 3 minutes;
    },
  });

  // Prefetch the screenings list on hover of any nav item that depends on it.
  // The query is shared across Sidebar usage polling, Dashboard, and the
  // Screenings page — so warming it up costs one HTTP roundtrip and benefits
  // every consumer.
  function prefetchScreenings() {
    // queryClient.prefetchQuery({ queryKey: userKey("screenings"), queryFn: listScreenings });
    //! Not requuired
  }

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
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuTriggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
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

  const visibleNavItems = canWrite ? navItems : navItems.filter((item) => item.href !== "/screenings/new");
  const initials = getInitials(displayName, email);
  const planLabel = usage ? PLAN_LABEL[usage.plan] : null;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn("flex h-14 shrink-0 items-center border-b border-[#F0EEEA] px-3", collapsed ? "justify-center" : "justify-between gap-2")}>
        {(!collapsed || !onToggleCollapsed) && (
          <a
            href={import.meta.env.VITE_HOME_PAGE_URL || "https://hiresort.ai"}
            rel="noopener noreferrer"
            aria-label="HireSort home"
            className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A17]"
          >
            <span className="text-lg font-semibold tracking-tight text-[#0F0F0F]">HireSort</span>
          </a>
        )}
        {onToggleCollapsed && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onToggleCollapsed();
                  }}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  aria-expanded={!collapsed}
                  aria-controls={navigationId}
                  className="group relative flex size-10 shrink-0 items-center justify-center rounded-xl text-[#737373] transition-colors hover:bg-[#F0EDE8] hover:text-[#0F0F0F] focus-visible:bg-[#F0EDE8] focus-visible:text-[#0F0F0F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A17]"
                >
                  {collapsed && (
                    <img src="/logo.png" alt="HireSort logo" className="size-6 object-contain motion-safe:transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0" />
                  )}
                  <span className={cn(
                    "absolute inset-0 flex items-center justify-center motion-safe:transition-opacity",
                    collapsed && "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
                  )}>
                    <PanelLeft size={16} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                {collapsed ? "Expand sidebar" : "Collapse sidebar"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Nav */}
      <nav id={navigationId} className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-3 md:px-2.5 md:py-2" aria-label="Sidebar navigation">
        {visibleNavItems.map((item) => {
          const active = isActive(item);
          // Dashboard and /screenings both consume the screenings list;
          // /screenings/new doesn't strictly need it but prefetching is cheap
          // and the user often goes new → list.
          const wantsScreenings = item.href === "/dashboard" || item.href.startsWith("/screenings");
          return (
            <Link
              key={item.href}
              to={item.href}
              onMouseEnter={wantsScreenings ? prefetchScreenings : undefined}
              onFocus={wantsScreenings ? prefetchScreenings : undefined}
              onClick={onNavigate}
              data-guide={item.data_guide}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex min-h-11 items-center rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A17] focus-visible:ring-offset-2 md:min-h-8",
                collapsed ? "justify-center p-1.5" : "gap-2.5 px-3 py-2.5 md:gap-2 md:px-2.5 md:py-1.5",
                active
                  ? "bg-[#0F0F0F] text-white"
                  : "text-[#404040] hover:bg-[#F5F3EE] hover:text-[#0F0F0F]",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span aria-hidden="true" className={cn("flex size-5 shrink-0 items-center justify-center", active ? "text-white" : "text-[#737373]")}>{item.icon}</span>
              <span className={collapsed ? "sr-only" : "truncate"}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User trigger + popup */}
      <div ref={menuRef} className="relative border-t border-[#E8E5DF] p-2 shrink-0">

        {/* Popup menu — opens upward, anchored to the trigger */}
        {menuOpen && (
          <div
            id={accountMenuId}
            className={cn(
              "absolute bottom-full left-2 z-50 mb-1.5 max-h-[calc(100dvh-80px)] overflow-y-auto rounded-2xl border border-[#E8E5DF] bg-white shadow-lg",
              collapsed ? "w-64" : "right-2",
            )}
          >
            {/* Identity card — clickable, navigates to profile */}
            <Link
              to="/profile"
              onClick={onNavigate}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#F5F3EE] transition-colors"
            >
              <div className="h-9 w-9 rounded-full bg-[#0F0F0F] flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-semibold leading-none">{initials}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#0F0F0F] truncate leading-tight">
                  {displayName ?? email ?? "—"}
                </p>
                {role !== "owner" && (
                  <p className="text-xs text-[#737373] truncate">Viewing: {ownerName ?? "linked account"}</p>
                )}
                {!unlimited && planLabel && (
                  <p className="text-xs text-[#737373] truncate leading-tight mt-0.5">
                    {planLabel}
                  </p>
                )}
              </div>
              <span className="text-[#A0A0A0] shrink-0">
                <ChevronRight />
              </span>
            </Link>

            <div className="px-4 pb-3 text-xs text-[#737373]" aria-busy={creditsLoading}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                <span>Credits Used</span>
                {monthlyCredits ? (
                  <span className="font-semibold tabular-nums text-[#0F0F0F]">
                    {monthlyCredits.planUsed.toLocaleString()} / {monthlyCredits.planAllocated.toLocaleString()}
                  </span>
                ) : (
                  <span>{creditsLoading ? "Loading…" : "Unavailable"}</span>
                )}
              </div>
              {monthlyCredits && monthlyCredits.planAllocated > 0 && (
                <div aria-hidden="true" className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F0EDE8]">
                  <div
                    className="h-full rounded-full bg-[#B65A27]"
                    style={{ width: `${Math.max(0, usedRatio(monthlyCredits.planUsed, monthlyCredits.planAllocated)) * 100}%` }}
                  />
                </div>
              )}
            </div>

            <div className="h-px bg-[#E8E5DF]" />

            <div className="py-1.5">
              {!unlimited && (
                <Link
                  to="/upgrade"
                  onClick={onNavigate}
                  // hash="billing"
                  className="flex items-center justify-between gap-3 px-4 py-2 text-sm text-[#404040] hover:bg-[#F5F3EE] transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <StarIcon />
                    Upgrade plan
                  </span>
                </Link>
              )}
              <Link
                to="/profile"
                onClick={onNavigate}
                className="flex items-center gap-3 px-4 py-2 text-sm text-[#404040] hover:bg-[#F5F3EE] transition-colors"
              >
                <UserIcon />
                Profile
              </Link>
              <Link
                to="/usage"
                onClick={onNavigate}
                className="flex items-center gap-3 px-4 py-2 text-sm text-[#404040] hover:bg-[#F5F3EE] transition-colors"
              >
                <Activity className="w-4 h-4 text-[#737373]" />
                Usage & Quotas
              </Link>
              <Link
                to="/settings"
                onClick={onNavigate}
                className="flex items-center gap-3 px-4 py-2 text-sm text-[#404040] hover:bg-[#F5F3EE] transition-colors"
              >
                <GearIcon />
                Settings
              </Link>
            </div>

            <div className="h-px bg-[#E8E5DF]" />

            <div className="py-1.5">
              <Link
                to="/contact"
                className="flex items-center gap-3 px-4 py-2 text-sm text-[#404040] hover:bg-[#F5F3EE] transition-colors"
              >
                <HelpIcon />
                Help
              </Link>
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
          ref={menuTriggerRef}
          type="button"
          aria-label="Account menu"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? accountMenuId : undefined}
          title={collapsed ? (displayName ?? email ?? "Account menu") : undefined}
          onClick={() => setMenuOpen((v) => !v)}
          className={cn(
            "flex min-h-12 w-full items-center rounded-xl py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A17]",
            collapsed ? "justify-center px-0" : "gap-2.5 px-3",
            menuOpen ? "bg-[#F0EDE8]" : "hover:bg-[#F5F3EE]",
          )}
        >
          <div className="h-8 w-8 rounded-full bg-[#0F0F0F] flex items-center justify-center shrink-0 select-none">
            <span className="text-white text-xs font-semibold leading-none">{initials}</span>
          </div>
          <div className={collapsed ? "sr-only" : "min-w-0 flex-1"}>
            <p className="text-sm font-semibold text-[#0F0F0F] truncate leading-tight">
              {displayName ?? email ?? "—"}
            </p>
            {role !== "owner" && (
              <p className="text-xs text-[#737373] truncate">Viewing: {ownerName ?? "linked account"}</p>
            )}
            {!unlimited && planLabel && (
              <p className="text-[11px] text-[#737373] truncate leading-tight mt-0.5">
                {planLabel}
              </p>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}

/**
 * Desktop sticky sidebar. Hidden below `md` — the mobile drawer
 * (see `MobileNav`) renders `SidebarInner` instead.
 */
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      // Collapsing still works when browser storage is unavailable.
    }
  }, [collapsed]);

  return (
    <aside
      aria-label="Main sidebar"
      data-collapsed={collapsed}
      className={cn(
        "relative z-40 hidden h-full shrink-0 flex-col border-r border-[#E8E5DF] bg-white motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-in-out md:flex",
        collapsed ? "w-16" : "w-55",
      )}
    >
      <SidebarInner collapsed={collapsed} onToggleCollapsed={() => setCollapsed((value) => !value)} />
    </aside>
  );
}

export default function SidebarDefault() {
  return <Sidebar />;
}
