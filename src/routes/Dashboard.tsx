import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BriefcaseBusiness, CalendarDays, CheckCheck, FileCheck2,
  Files, Mic, Plus, Sparkles, Video, Wallet,
} from "lucide-react";
import { listScreenings } from "@/lib/api";
import { useUserKey } from "@/lib/userKey";
import { formatRelativeDate } from "@/lib/utils";
import { useAccount } from "@/hooks/useAccount";
import { useUserUsageQuotas } from "@/modules/subscription/useSubscription";
import { creditBalance } from "@/modules/subscription/credits";
import { AnalyticsEvent, useAnalytics } from "@/analytics";
import { useGuide } from "@/guides";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A17] focus-visible:ring-offset-4";
const panel = "rounded-2xl border border-[#E8E5DF] bg-white shadow-[0_2px_8px_-4px_rgba(15,15,15,0.08)]";
const formatCount = (value: number) => value.toLocaleString();

function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`block rounded-md bg-[#EAE7DF] motion-safe:animate-pulse ${className}`} />;
}

export default function Dashboard() {
  const { canWrite } = useAccount();
  const analytics = useAnalytics();
  const { startGuide } = useGuide();
  // Reuse the existing list and usage queries. No per-job requests or polling
  // are needed to populate this overview.
  const { data: screenings, isPending: screeningsLoading, isError: screeningsError, refetch: retryScreenings, isFetching: screeningsFetching } = useQuery({
    queryKey: useUserKey("screenings"),
    queryFn: listScreenings,
  });
  const { data: usageData, isPending: usageLoading, refetch: retryUsage, isFetching: usageFetching } = useUserUsageQuotas();
  const monthlyCredits = usageData ? creditBalance(usageData) : null;
  const featureUsage = [
    { label: "Resumes screened", used: usageData?.usage.resume_scoring ?? 0, icon: FileCheck2, tint: "bg-[#FCF0E7] text-[#A74812]" },
    { label: "Voice screens", used: usageData?.usage.voice_screen ?? 0, icon: Mic, tint: "bg-[#EFF5F1] text-[#466C56]" },
    { label: "Interviews", used: usageData?.usage.interview ?? 0, icon: Video, tint: "bg-[#F2EFF7] text-[#70618F]" },
  ];
  const planUsedPercent = monthlyCredits && monthlyCredits.planAllocated > 0
    ? Math.min(100, Math.max(0, monthlyCredits.planUsed / monthlyCredits.planAllocated * 100))
    : 0;

  useEffect(() => {
    startGuide("onboarding");
  }, []);

  const jobs = screenings ?? [];
  const recent = jobs.slice(0, 5);
  const totalResumes = jobs.reduce((sum, job) => sum + job.screened_cnt, 0);
  const totalApplications = jobs.reduce((sum, job) => sum + job.parsed_cnt + job.screened_cnt, 0);
  const stats = [
    { label: "Total jobs", value: screenings ? jobs.length : null, loading: screeningsLoading, icon: BriefcaseBusiness, tint: "bg-[#FCF0E7] text-[#A74812]" },
    { label: "Applications", value: screenings ? totalApplications : null, loading: screeningsLoading, icon: Files, tint: "bg-[#F2EFF7] text-[#70618F]" },
    { label: "Resumes screened", value: screenings ? totalResumes : null, loading: screeningsLoading, icon: FileCheck2, tint: "bg-[#EFF5F1] text-[#466C56]" },
  ];
  const trackNewJob = (source: "dashboard" | "empty_state") => analytics.track(AnalyticsEvent.JOB_CREATE_STARTED, { source });

  return (
    <div className="@container mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:space-y-7 lg:p-8 xl:p-10">
      <header className="flex flex-wrap items-center justify-between gap-4">

        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#A74812]">Your workspace</p>
        {/* <h1 className="text-2xl font-semibold tracking-tight text-[#0F0F0F] sm:text-3xl">Dashboard</h1> */}
        <div className="mt-2 flex items-center gap-2 text-xs text-[#737373]">
          <CalendarDays size={14} aria-hidden="true" />
          <time dateTime={[new Date().getFullYear(), String(new Date().getMonth() + 1).padStart(2, "0"), String(new Date().getDate()).padStart(2, "0")].join("-")}>
            {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </time>
        </div>

      </header>
      {/*
      <section className="relative isolate overflow-hidden rounded-2xl bg-[#1C201D] px-6 py-7 text-white sm:px-8 sm:py-8" aria-labelledby="workspace-heading">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-32 -z-10 h-96 w-96 rounded-full border border-white/[0.08] bg-[radial-gradient(circle,rgba(200,90,23,0.16),transparent_70%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-44 right-4 -z-10 h-80 w-80 rounded-full border border-white/[0.06]" />
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#EDB68E]">
              <Sparkles size={16} aria-hidden="true" />
              A little clarity. A better hire.
            </div>
            <h2 id="workspace-heading" className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">Your hiring, in focus.</h2>
            <p className="mt-3 max-w-lg text-base leading-relaxed text-[#BDC4BE]">Pick up where you left off, review your candidates, and keep your next hire moving.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3 lg:flex-col lg:items-stretch">
            {canWrite && (
              <Link to="/screenings/new" onClick={() => trackNewJob("dashboard")} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#EAA16B] px-5 py-2.5 text-sm font-semibold text-[#25180E] transition-colors hover:bg-[#F2B88C] ${focusRing}`}>
                <Plus size={17} aria-hidden="true" /> New job
              </Link>
            )}
            <Link to="/screenings" className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 ${focusRing}`}>
              <BriefcaseBusiness size={16} aria-hidden="true" /> Browse jobs
            </Link>
          </div>
        </div>
      </section> */}

      <section aria-label="Workspace totals" className="grid gap-3 @min-[560px]:grid-cols-3 @min-[560px]:gap-4">
        {stats.map(({ label, value, loading, icon: Icon, tint }) => (
          <div key={label} className={`${panel} flex items-center justify-between gap-3 px-5 py-4`}>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#62625D]">{label}</p>
              <div className="mt-1.5 text-3xl font-semibold leading-none tracking-tight text-[#0F0F0F] tabular-nums" aria-busy={loading}>
                {loading ? <><span className="sr-only">Loading</span><Skeleton className="h-8 w-20" /></> : value !== null ? formatCount(value) : <span aria-label="Unavailable">&mdash;</span>}
              </div>
            </div>
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tint}`}><Icon size={19} strokeWidth={1.7} aria-hidden="true" /></span>
          </div>
        ))}
      </section>

      <div className="grid items-start gap-6 @min-[960px]:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <section className={`${panel} min-w-0 overflow-hidden`} aria-labelledby="recent-jobs-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEEBE5] px-5 py-5 sm:px-6">
            <div>
              <h2 id="recent-jobs-heading" className="text-base font-semibold text-[#0F0F0F]">Recent jobs</h2>
              <p className="mt-1 text-sm text-[#737373]">Your latest roles, ready to pick up.</p>
            </div>
            <Link to="/screenings" className={`rounded-lg border border-[#E8E5DF] px-3 py-2 text-sm font-medium text-[#404040] transition-colors hover:bg-[#F5F3EE] ${focusRing}`}>View all jobs</Link>
          </div>

          {screeningsLoading ? (
            <div aria-busy="true" aria-label="Loading recent jobs" className="divide-y divide-[#F0EEEA]">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="flex items-center gap-4 px-5 py-5 sm:px-6">
                  <Skeleton className="size-11 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-3/5" /><Skeleton className="h-3 w-2/5" /></div>
                  <Skeleton className="hidden h-6 w-20 sm:block" />
                </div>
              ))}
            </div>
          ) : screeningsError && !screenings ? (
            <div role="status" className="px-6 py-16 text-center">
              <p className="font-medium text-[#404040]">We couldn't load your jobs.</p>
              <p className="mt-2 text-sm text-[#737373]">Try again to see your latest roles and totals.</p>
              <button type="button" onClick={() => void retryScreenings()} disabled={screeningsFetching} className={`mt-5 min-h-11 rounded-xl border border-[#E8E5DF] px-4 text-sm font-medium hover:bg-[#F5F3EE] disabled:opacity-50 ${focusRing}`}>{screeningsFetching ? "Retrying..." : "Try again"}</button>
            </div>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <div className="relative mb-6 flex size-16 items-center justify-center rounded-2xl border border-[#EDDCCC] bg-[#FCF0E7] text-[#A74812]">
                <BriefcaseBusiness size={28} strokeWidth={1.4} aria-hidden="true" />
                <span className="absolute -bottom-2 -right-2 flex size-7 items-center justify-center rounded-lg border-2 border-white bg-[#1C201D] text-white"><Plus size={14} aria-hidden="true" /></span>
              </div>
              <h3 className="text-lg font-semibold text-[#0F0F0F]">Great hires start with a role.</h3>
              <p className="mt-2 max-w-xs text-base text-[#737373]">{canWrite ? "Create your first job, add resumes, and find the candidates worth a conversation." : "Jobs shared with this workspace will appear here, ready for you to review."}</p>
              {canWrite && <Link to="/screenings/new" onClick={() => trackNewJob("empty_state")} className={`mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0F0F0F] px-5 text-sm font-medium text-white hover:bg-[#303030] ${focusRing}`}><Plus size={16} aria-hidden="true" /> Create your first job</Link>}
            </div>
          ) : (
            <ul className="divide-y divide-[#F0EEEA]">
              {recent.map((job) => {
                const applications = job.screened_cnt + job.parsed_cnt;
                const screenedPercent = applications > 0 ? Math.min(100, Math.max(0, job.screened_cnt / applications * 100)) : 0;
                return (
                  <li key={job.id}>
                    <Link to="/screenings/$id" params={{ id: job.id }} className="group flex min-w-0 items-center gap-3 px-5 py-5 transition-colors hover:bg-[#FAF9F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C85A17] sm:gap-4 sm:px-6">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#E8E5DF] bg-[#F8F7F4] text-[#73736A] transition-colors group-hover:border-[#EBCDB7] group-hover:bg-[#FCF0E7] group-hover:text-[#A74812]"><BriefcaseBusiness size={19} strokeWidth={1.6} aria-hidden="true" /></span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-[#252521] group-hover:text-[#A74812]" title={job.title}>{job.title}</h3>
                        <p className="mt-1 text-xs text-[#737373]">{formatCount(applications)} {applications === 1 ? "application" : "applications"}</p>
                        <p className="mt-1 text-xs text-[#466C56] sm:hidden">{formatCount(job.screened_cnt)} screened</p>
                      </div>
                      <div className="hidden w-28 shrink-0 sm:block">
                        <p className="mb-2 text-right text-xs text-[#62625D]">{formatRelativeDate(job.created_at)}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {recent.length > 0 && <div className="flex items-start gap-2 border-t border-[#EEEBE5] bg-[#FAF9F6] px-5 py-3.5 text-xs leading-relaxed text-[#737373] sm:px-6"><CheckCheck size={15} className="mt-0.5 shrink-0 text-[#648875]" aria-hidden="true" />Open a job to review applications and screening results.</div>}
        </section>

        <aside className="grid min-w-0 gap-4 @min-[640px]:grid-cols-2 @min-[960px]:grid-cols-1" aria-label="Usage overview">
          <Link to="/usage" className={`block min-w-0 self-start rounded-xl border border-[#E8D9C9] bg-[#F8EFE5] px-4 py-3 transition-colors hover:bg-[#F3E6D8] ${focusRing}`}>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="flex items-center gap-2 text-sm font-medium text-[#392B20]"><Wallet size={15} className="text-[#A74812]" aria-hidden="true" />Monthly credits</span>
              <span className="text-xs font-medium text-[#945020] underline decoration-[#DDC7B1] underline-offset-4">View usage</span>
            </div>
            {usageLoading && !usageData ? (
              <div className="mt-2 space-y-2" aria-busy="true" aria-label="Loading credits"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-1 w-full" /></div>
            ) : monthlyCredits ? (
              <>
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-[#7A6654]">
                  <span><strong className="text-base font-semibold text-[#392B20] tabular-nums">{formatCount(monthlyCredits.planRemaining)}</strong> remaining</span>
                  <span className="tabular-nums">{formatCount(monthlyCredits.planUsed)} / {formatCount(monthlyCredits.planAllocated)} used</span>
                </div>
                <div aria-hidden="true" className="mt-2 h-1 overflow-hidden rounded-full bg-[#E8D9C9]"><div className="h-full rounded-full bg-[#B65A27]" style={{ width: `${planUsedPercent}%` }} /></div>
                <span className="sr-only">Credits included in your monthly plan.</span>
              </>
            ) : <p className="mt-2 text-xs text-[#7A6654]">Credit balance is unavailable.</p>}
          </Link>
          <section className={`${panel} min-w-0 p-4 sm:p-5`} aria-labelledby="activity-heading">
            <h2 id="activity-heading" className="mb-3 text-base font-semibold text-[#0F0F0F]">Activity this month</h2>
            {!usageLoading && !usageData ? (
              <div role="status"><p className="text-sm text-[#737373]">Monthly usage is unavailable.</p><button type="button" onClick={() => void retryUsage()} disabled={usageFetching} className={`mt-3 min-h-11 rounded-lg px-2 text-sm font-medium text-[#A74812] hover:bg-[#FCF0E7] disabled:opacity-50 ${focusRing}`}>{usageFetching ? "Retrying..." : "Try again"}</button></div>
            ) : (
              <dl className="grid gap-2" aria-busy={usageLoading}>
                {featureUsage.map(({ label, used, icon: Icon, tint }) => (
                  <div key={label} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[#EEEBE5] bg-[#FAF9F6] px-3 py-2.5">
                    <dt className="flex min-w-0 items-center gap-2.5 text-sm font-medium text-[#404040]">
                      <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${tint}`}><Icon size={14} aria-hidden="true" /></span>
                      {label}
                    </dt>
                    <dd className="text-lg font-semibold leading-none text-[#252521] tabular-nums">
                      {usageLoading ? <><span className="sr-only">Loading</span><Skeleton className="h-4 w-7" /></> : formatCount(used)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>


        </aside>
      </div>
    </div>
  );
}
