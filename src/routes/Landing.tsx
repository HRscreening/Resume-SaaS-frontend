import { Link } from "@tanstack/react-router";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#F5F3EE]">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-[#F5F3EE]/90 backdrop-blur-xl border-b border-[#EBE8E2]">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-[68px]">
          <Link to="/" className="flex items-center gap-2.5 no-underline text-[#2C2C2C]">
            <div className="w-9 h-9 bg-gradient-to-br from-[#2C2C2C] to-[#4A4A4A] rounded-[10px] flex items-center justify-center text-white font-bold text-[15px]">
              H
            </div>
            <span className="text-[19px] font-bold tracking-[-0.4px]">HireSort</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-[14px] font-medium text-[#4A4A4A] no-underline hover:text-[#2C2C2C] transition-colors"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-[22px] py-[10px] bg-[#2C2C2C] text-white border border-[#2C2C2C] rounded-lg text-[14.5px] font-semibold no-underline hover:bg-[#1C1C1C] transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[rgba(200,90,23,0.06)] border border-[rgba(200,90,23,0.15)] rounded-full text-[13px] font-semibold text-[#C85A17] mb-7">
          <span className="w-[7px] h-[7px] bg-[#C85A17] rounded-full animate-pulse" />
          AI-powered resume screening
        </div>

        <h1 className="text-[clamp(36px,5.5vw,58px)] font-extrabold leading-[1.12] tracking-[-1.5px] text-[#2C2C2C] mb-5">
          AI-Powered Resume Screening
        </h1>

        <p className="text-[clamp(16px,2vw,19px)] text-[#7A7A7A] max-w-[520px] mx-auto mb-12 leading-relaxed">
          Upload resumes, describe the role, and let AI rank your candidates with
          explainable scores. No more manual screening.
        </p>

        <Link
          to="/signup"
          className="inline-flex items-center gap-2 h-12 px-8 bg-[#C85A17] text-white rounded-xl text-[15px] font-semibold no-underline hover:bg-[#B04F14] transition-colors"
        >
          Get started free
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </Link>
      </section>
    </div>
  );
}
