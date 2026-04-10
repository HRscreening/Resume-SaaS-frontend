import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listScreenings, getUsage } from "@/lib/api";
import { formatRelativeDate } from "@/lib/utils";
import type { ScreeningListItem } from "@/types";

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-purple-50 text-purple-700 border-purple-200",
    completed: "bg-green-50 text-green-700 border-green-200",
    processing: "bg-blue-50 text-blue-700 border-blue-200",
    pending: "bg-[#F5F3EE] text-[#737373] border-[#D4D4D4]",
    failed: "bg-red-50 text-red-700 border-red-200",
  };
  const labels: Record<string, string> = {
    draft: "Draft",
    completed: "Completed",
    processing: "Processing",
    pending: "Pending",
    failed: "Failed",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${map[status] ?? map.pending}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function Dashboard() {
  const { data: screenings = [], isLoading: screeningsLoading } = useQuery({
    queryKey: ["screenings"],
    queryFn: listScreenings,
  });
  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["usage"],
    queryFn: getUsage,
  });

  const isLoading = screeningsLoading || usageLoading;

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="h-6 w-6 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin" />
      </div>
    );
  }

  const recent = screenings.slice(0, 5);
  const completed = screenings.filter((s: ScreeningListItem) => s.status === "completed").length;
  const totalResumes = screenings.reduce((sum: number, s: ScreeningListItem) => sum + s.total_resumes, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F0F0F]">Dashboard</h1>
        </div>
        <Link
          to="/screenings/new"
          className="h-10 px-4 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] transition-colors inline-flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M7 1.5v11M1.5 7h11"/>
          </svg>
          New screening
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total screenings", value: screenings.length },
          { label: "Completed", value: completed },
          { label: "Resumes screened", value: totalResumes },
          {
            label: "Monthly usage",
            value: usage ? `${usage.resumes_processed} / ${usage.quota_limit}` : "\u2014",
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-[#E8E5DF] p-5">
            <p className="text-xs text-[#737373] mb-1.5">{stat.label}</p>
            <p className="text-2xl font-bold text-[#0F0F0F]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Usage bar */}
      {usage && (
        <div className="bg-white rounded-xl border border-[#E8E5DF] p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-[#0F0F0F]">Monthly quota</p>
              <p className="text-xs text-[#737373] mt-0.5">
                {usage.resumes_processed} of {usage.quota_limit} resumes used
              </p>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-[#F5F3EE] rounded-md text-[#404040]">
              {usage.plan}
            </span>
          </div>
          <div className="h-2 w-full bg-[#E8E5DF] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0F0F0F] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round((usage.resumes_processed / usage.quota_limit) * 100))}%` }}
            />
          </div>
          {usage.plan === "FREE" && usage.resumes_processed / usage.quota_limit >= 0.8 && (
            <p className="mt-3 text-xs text-[#C85A17]">
              Running low.{" "}
              <Link to="/settings" className="underline font-medium">Upgrade to Pro</Link>{" "}
              for 500 resumes/month.
            </p>
          )}
        </div>
      )}

      {/* Recent screenings */}
      <div className="bg-white rounded-xl border border-[#E8E5DF]">
        <div className="px-6 py-4 border-b border-[#E8E5DF] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#0F0F0F]">Recent screenings</h2>
          <Link to="/screenings" className="text-xs text-[#737373] hover:text-[#0F0F0F]">
            View all &rarr;
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-[#F5F3EE] flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#A0A0A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2.5" y="3" width="15" height="14" rx="2"/>
                <path d="M6 7h8M6 10h5"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-[#404040] mb-1">No screenings yet</p>
            <p className="text-xs text-[#737373] mb-4">Upload your first batch of resumes to get started.</p>
            <Link
              to="/screenings/new"
              className="inline-flex items-center h-9 px-4 bg-[#0F0F0F] text-white text-sm font-medium rounded-lg hover:bg-[#1C1C1C] transition-colors"
            >
              Create first screening
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[#E8E5DF]">
            {recent.map((s: ScreeningListItem) => (
              <li key={s.id}>
                <Link
                  to="/screenings/$id" params={{ id: s.id }}
                  className="flex items-center justify-between px-6 py-4 hover:bg-[#F5F3EE] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0F0F0F] truncate">{s.title}</p>
                    <p className="text-xs text-[#737373] mt-0.5">
                      {s.total_resumes} resumes &middot; {formatRelativeDate(s.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4 shrink-0">
                    {s.avg_score !== null && (
                      <span className="text-sm font-semibold text-[#0F0F0F]">
                        {Math.round(s.avg_score)}
                        <span className="text-xs text-[#737373] font-normal"> avg</span>
                      </span>
                    )}
                    <StatusPill status={s.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
