import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { completeOnboarding, getProfile } from "@/lib/api";

const ROLE_OPTIONS = [
  "Recruiter",
  "Hiring Manager",
  "HR Lead",
  "Staffing Agency",
  "Founder / CEO",
  "Other",
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // If already onboarded, skip straight to dashboard
  useEffect(() => {
    getProfile()
      .then((profile) => {
        if (profile.onboarding_completed) {
          navigate({ to: "/dashboard", replace: true });
        } else {
          // Pre-fill whatever they already have
          if (profile.full_name) setName(profile.full_name);
          if (profile.company_name) setCompany(profile.company_name);
          if (profile.reported_role) setRole(profile.reported_role);
        }
      })
      .catch(() => {
        // Not logged in -- auth guard will redirect to login
      })
      .finally(() => setChecking(false));
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await completeOnboarding({
        full_name: name.trim(),
        company_name: company.trim() || undefined,
        reported_role: role || undefined,
      });
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F5F3EE" }}>
        <div className="h-6 w-6 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin"/>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ backgroundColor: "#F5F3EE" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="h-8 w-8 bg-[#0F0F0F] rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">HS</span>
          </div>
          <span className="font-semibold text-[#0F0F0F]">HireSort</span>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-8">
          <h1 className="text-2xl font-bold text-[#0F0F0F] mb-1">Set up your account</h1>
          <p className="text-sm text-[#737373] mb-8">Tell us a bit about yourself — takes 30 seconds.</p>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full h-11 px-3.5 rounded-xl border border-[#D4D4D4] bg-[#F5F3EE] text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow"
              />
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">
                Company <span className="text-[#A0A0A0] font-normal text-xs">(optional)</span>
              </label>
              <input
                id="company"
                type="text"
                autoComplete="organization"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Corp"
                className="w-full h-11 px-3.5 rounded-xl border border-[#D4D4D4] bg-[#F5F3EE] text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F0F0F] mb-2">
                What best describes you? <span className="text-[#A0A0A0] font-normal text-xs">(optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setRole(role === opt ? "" : opt)}
                    className={`h-10 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      role === opt
                        ? "bg-[#0F0F0F] border-[#0F0F0F] text-white"
                        : "bg-white border-[#D4D4D4] text-[#404040] hover:border-[#404040]"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full h-11 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading && (
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>
              )}
              Continue to dashboard
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
