import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { clearAuthCache } from "@/lib/auth";
import { getUsage, listScreenings } from "@/lib/api";
import { useUserKey, userKey } from "@/lib/userKey";
import { useAccount } from "@/hooks/useAccount";
import { useUsage } from "@/hooks/useUsage";
import { meterColor, usedRatio } from "@/components/usage/QuotaMeter";
import { cn } from "@/lib/utils";
import type { SubscriptionPlan } from "@/types";
import { User, Activity } from "lucide-react";

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
  { href: "/screenings", label: "Jobs", icon: <ListIcon /> , data_guide:"existing_jobs"},
  // { href: "/candidates", label: "Candidates", icon: <User size={14} />, exact: true },
];

const PLAN_LABEL: Record<SubscriptionPlan, string> = {
  FREE: "Free",
  PRO: "Pro",
  PLUS: "Plus",
  LITE: "Lite",
  BUSINESS: "Plus",
  ENTERPRISE: "Enterprise",
  UNLIMITED: "Unlimited",
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

/**
 * Stateful inner content — logo + nav items + user menu — shared between
 * the desktop sticky aside (`Sidebar`) and the mobile drawer (`MobileNav`).
 * `onNavigate` fires whenever a Link is clicked, so the mobile drawer can
 * close itself on route change without duplicating state.
 */
export function SidebarInner({ onNavigate }: { onNavigate?: () => void } = {}) {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { canWrite, ownerName, role } = useAccount();
  const { unlimited, totals } = useUsage();


  const [displayName, setDisplayName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);


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

  const visibleNavItems = canWrite ? navItems : navItems.filter((item) => item.href !== "/screenings/new");
  const initials = getInitials(displayName, email);
  const planLabel = usage ? PLAN_LABEL[usage.plan] : null;
  const used = usage?.resumes_processed ?? 0;
  const limit = usage?.quota_limit ?? 0;
  const isFree = usage?.plan === "FREE";
  const voiceUsed = usage?.voice_calls_made ?? 0;
  const voiceLimit = usage?.voice_calls_limit ?? 0;
  // Voice carries its own cadence: on Free the calls refill monthly even
  // though the resume allowance never does.
  const voiceRefills = usage?.voice_calls_period !== "lifetime";

  return (
    <div className="flex flex-col h-full">
      {/* Logo — clickable, returns to marketing site. */}
      <a
        href={import.meta.env.VITE_HOME_PAGE_URL || "https://hiresort.ai"}
        rel="noopener noreferrer"
      >
        <div className="h-14 flex items-center px-5 border-b border-[#E8E5DF] shrink-0">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="HireSort logo" className="h-6 w-auto" />
            <span className="font-semibold text-[#0F0F0F] text-sm">HireSort</span>
          </div>
        </div>
      </a>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5" aria-label="Sidebar navigation">
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
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-lg text-sm font-medium transition-colors duration-150",
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
      <div ref={menuRef} className="relative border-t border-[#E8E5DF] p-2 shrink-0">

        {/* Popup menu — opens upward, anchored to the trigger */}
        {menuOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-1.5 bg-white rounded-2xl border border-[#E8E5DF] shadow-lg overflow-hidden z-50">
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

            {/* Usage progress (HireSort-specific). Colours come from the same
                helpers the dashboard meters use — this block used to warn at
                70%/90% while the dashboard warned at 80%/100%, so the same
                account could look amber in one place and neutral in the
                other. */}
            {!unlimited && usage && (limit > 0 || voiceLimit > 0) && (
              <div className="px-4 pb-3 space-y-2.5">
                {limit > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[#737373]">
                        {usage.month === "LIFETIME" ? "Resumes used" : "Resumes this month"}
                      </span>
                      <span className="font-semibold text-[#0F0F0F] tabular-nums">{used} / {limit}</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#F0EDE8] rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", meterColor(used, limit))}
                        style={{ width: `${Math.round(usedRatio(used, limit) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {voiceLimit > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[#737373]">
                        {voiceRefills ? "Voice calls this month" : "Voice calls used"}
                      </span>
                      <span className="font-semibold text-[#0F0F0F] tabular-nums">
                        {voiceUsed} / {voiceLimit}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#F0EDE8] rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", meterColor(voiceUsed, voiceLimit))}
                        style={{ width: `${Math.round(usedRatio(voiceUsed, voiceLimit) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Unlimited accounts have no quota to show a bar for — list the
                all-time counters as plain lines instead. */}
            {unlimited && totals.length > 0 && (
              <div className="px-4 pb-3 space-y-1">
                {totals.map((counter) => (
                  <div key={counter.key} className="flex items-center justify-between text-xs">
                    <span className="text-[#737373]">{counter.label}</span>
                    <span className="font-semibold text-[#0F0F0F] tabular-nums">{counter.value}</span>
                  </div>
                ))}
              </div>
            )}

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
                  {isFree && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                      New
                    </span>
                  )}
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
  return (
    <aside className="w-55 h-screen hidden md:flex flex-col bg-white border-r border-[#E8E5DF] shrink-0">
      <SidebarInner />
    </aside>
  );
}

export default function SidebarDefault() {
  return <Sidebar />;
}
