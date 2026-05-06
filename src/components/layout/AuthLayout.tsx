import { Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const home_page_url = import.meta.env.VITE_HOME_PAGE_URL || "http://localhost:8000";

const quotes = [
  "Find the right candidates faster without manual screening, and focus your time on making the best hiring decisions.",
  "Spend less time filtering through applications and more time connecting with the candidates who truly matter.",
  "Smart matching powered by data helps you make faster, more confident hiring decisions every time.",
  "Turn hours of manual screening into minutes with a streamlined and intelligent hiring workflow.",
  "Great teams start with better discovery—identify top talent early and build stronger teams with ease.",
];

export function AuthLayout() {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % quotes.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (index === displayed) return;
    setPhase("out");
    const t = setTimeout(() => {
      setDisplayed(index);
      setPhase("in");
    }, 450);
    return () => clearTimeout(t);
  }, [index, displayed]);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#F5F3EE" }}>
      {/* Left panel */}
      <div className="hidden lg:flex w-[480px] bg-[#0F0F0F] flex-col justify-between p-12 shrink-0">
        <Link to={`${home_page_url as  string}`} className="flex items-center gap-2.5">
          <img src="/logo.png" alt="HireSort Logo" className="h-8 w-auto" />
          <span className="text-white font-semibold">HireSort</span>
        </Link>

        <div>
          <div className="relative h-40 overflow-hidden">
            {phase === "in" ? (
              <blockquote
                key={displayed}
                className="absolute inset-0 text-white/85 text-lg leading-relaxed animate-quote-in"
              >
                &ldquo;{quotes[displayed]}&rdquo;
              </blockquote>
            ) : (
              <blockquote
                className="absolute inset-0 text-white/85 text-lg leading-relaxed animate-quote-out"
              >
                &ldquo;{quotes[displayed]}&rdquo;
              </blockquote>
            )}
          </div>
          <div className="flex items-center gap-2 mt-6">
            {quotes.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                  i === index ? "w-6 bg-white/80" : "w-1.5 bg-white/25"
                }`}
              />
            ))}
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
