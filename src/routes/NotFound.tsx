import { Link } from "@tanstack/react-router";
import { isAuthenticated } from "@/lib/auth";

export default function NotFound() {
  const authed = isAuthenticated();
  const homeHref = authed ? "/dashboard" : "/";
  const homeLabel = authed ? "Back to dashboard" : "Back to home";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: "#F5F3EE" }}
    >
      <div className="max-w-md w-full text-center">
        <p className="text-xs font-semibold text-[#C85A17] uppercase tracking-wide mb-3">
          404
        </p>
        <h1 className="text-2xl font-bold text-[#0F0F0F] mb-2">
          Page not found
        </h1>
        <p className="text-sm text-[#737373] mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to={homeHref}
            className="h-10 px-5 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] transition-colors flex items-center gap-2"
          >
            {homeLabel}
          </Link>
          <button
            onClick={() => window.history.back()}
            className="h-10 px-5 border border-[#D4D4D4] text-sm font-medium text-[#404040] rounded-xl hover:bg-white transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
