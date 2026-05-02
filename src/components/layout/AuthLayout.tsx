import { Link, Outlet } from "@tanstack/react-router";

const home_page_url = import.meta.env.VITE_HOME_PAGE_URL || "http://localhost:8000";

export function AuthLayout() {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#F5F3EE" }}>
      {/* Left panel */}
      <div className="hidden lg:flex w-[480px] bg-[#0F0F0F] flex-col justify-between p-12 shrink-0">
        <Link to={`${home_page_url as  string}`} className="flex items-center gap-2.5">
          <img src="/logo.png" alt="HireSort Logo" className="h-8 w-auto" />
          <span className="text-white font-semibold">HireSort</span>
        </Link>

        <div>
          <blockquote className="text-white/80 text-lg leading-relaxed mb-6">
            &ldquo;We went from spending 3 hours screening to under 15 minutes. HireSort surfaces the right candidates every time.&rdquo;
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-white text-sm font-medium">AK</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">Alex Kim</p>
              <p className="text-white/50 text-xs">Head of Talent, Fintech startup</p>
            </div>
          </div>
        </div>

        <p className="text-white/30 text-xs">&copy; 2026 HireSort</p>
      </div>

      {/* Right -- form area */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="h-7 w-7 bg-[#0F0F0F] rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">HS</span>
            </div>
            <span className="font-semibold text-[#0F0F0F]">HireSort</span>
          </Link>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default function AuthLayoutDefault() {
  return <AuthLayout />;
}
