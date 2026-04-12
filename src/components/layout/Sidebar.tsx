import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { createClient } from "@/lib/supabase/client";
import { clearAuthCache } from "@/lib/auth";
import { cn } from "@/lib/utils";

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

const GearIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="2.5"/>
    <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.3 3.3l.7.7M12 12l.7.7M12 3.3l-.7.7M3.3 12.7l.7-.7"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M11 11l3-3-3-3M14 8H6"/>
  </svg>
);

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <HomeIcon />, exact: true },
  { href: "/screenings", label: "Jobs", icon: <ListIcon /> },
  { href: "/screenings/new", label: "New Job", icon: <PlusIcon />, exact: true },
  { href: "/settings", label: "Settings", icon: <GearIcon />, exact: true },
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

export function Sidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

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

  async function handleLogout() {
    setLoggingOut(true);
    clearAuthCache();
    const supabase = createClient();
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    // Don't highlight "Jobs" when on a route that matches another exact nav item
    const exactMatch = navItems.find((n) => n.exact && n.href !== item.href && pathname === n.href);
    if (exactMatch) return false;
    return pathname.startsWith(item.href);
  }

  const initials = getInitials(displayName, email);

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
                  : "text-[#404040] hover:bg-[#F5F3EE] hover:text-[#0F0F0F]"
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className={cn(active ? "text-white" : "text-[#737373]")}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User profile section */}
      <div className="border-t border-[#E8E5DF]">
        {/* Avatar + user info */}
        <div className="px-4 py-3 flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-full bg-[#C85A17] flex items-center justify-center shrink-0 select-none"
            draggable={false}
            aria-hidden="true"
          >
            <span className="text-white text-xs font-semibold leading-none">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            {displayName && (
              <p className="text-xs font-medium text-[#0F0F0F] truncate leading-tight">{displayName}</p>
            )}
            <p className="text-xs text-[#737373] truncate leading-tight">{email ?? "\u2014"}</p>
          </div>
        </div>

        {/* Account & Billing + Logout */}
        <div className="px-3 pb-3 space-y-0.5">
          <Link
            to="/settings"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#404040] hover:bg-[#F5F3EE] hover:text-[#0F0F0F] transition-colors"
          >
            Account &amp; billing
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#737373] hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <LogoutIcon />
            {loggingOut ? "Signing out\u2026" : "Sign out"}
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function SidebarDefault() {
  return <Sidebar />;
}
