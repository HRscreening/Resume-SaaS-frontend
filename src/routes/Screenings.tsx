import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listScreenings } from "@/lib/api";
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

export default function Screenings() {
  const { data: screenings = [], isLoading } = useQuery({
    queryKey: ["screenings"],
    queryFn: listScreenings,
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="h-6 w-6 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[#0F0F0F]">Screenings</h1>
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

      {screenings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E5DF] py-24 text-center">
          <div className="h-14 w-14 rounded-full bg-[#F5F3EE] flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A0A0A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <path d="M14 2v6h6M8 13h8M8 17h5"/>
            </svg>
          </div>
          <p className="text-base font-semibold text-[#0F0F0F] mb-2">No screenings yet</p>
          <p className="text-sm text-[#737373] mb-6 max-w-xs mx-auto">
            Upload your first batch of resumes and let AI rank your candidates.
          </p>
          <Link
            to="/screenings/new"
            className="inline-flex items-center h-10 px-5 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] transition-colors"
          >
            Create screening
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
          <table className="w-full candidates-table">
            <thead>
              <tr className="border-b border-[#E8E5DF]">
                <th className="px-6 py-3.5 text-left text-xs font-medium text-[#737373] uppercase tracking-wide">Title</th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-[#737373] uppercase tracking-wide hidden md:table-cell">Resumes</th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-[#737373] uppercase tracking-wide hidden md:table-cell">Avg score</th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-[#737373] uppercase tracking-wide">Status</th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-[#737373] uppercase tracking-wide hidden lg:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5DF]">
              {screenings.map((s: ScreeningListItem) => (
                <tr key={s.id} className="hover:bg-[#F5F3EE] transition-colors">
                  <td className="px-6 py-4">
                    <Link to="/screenings/$id" params={{ id: s.id }} className="text-sm font-medium text-[#0F0F0F] hover:underline">
                      {s.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#404040] hidden md:table-cell">
                    {s.total_resumes}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-[#0F0F0F] hidden md:table-cell">
                    {s.avg_score !== null ? Math.round(s.avg_score) : "\u2014"}
                  </td>
                  <td className="px-6 py-4">
                    <StatusPill status={s.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-[#737373] hidden lg:table-cell">
                    {formatRelativeDate(s.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
