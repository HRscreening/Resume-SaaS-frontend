import { type SourcingData, PlatformName } from "@/types/sourcingData.types";

import { formatDistanceToNowStrict } from "date-fns"
import { toast } from "sonner";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/Button";


interface SourcingModalProps {
  screening_id: string;
  onClose: () => void;
}

const sourcingData: SourcingData[] = [
  {
    platform: PlatformName.HIRIST,
    new_applications_cnt: 10,
    total_fetched_applications: 50,
    last_fetched_at: "2026-08-01T12:00:00Z",
  },
  {
    platform: PlatformName.LINKEDIN,
    new_applications_cnt: 0,
    total_fetched_applications: 0,
    last_fetched_at: null,
  },
  {
    platform: PlatformName.NAUKRI,
    new_applications_cnt: 0,
    total_fetched_applications: 40,
    last_fetched_at: "2026-08-03T09:45:00Z",
  },
];

// Returns just the raw logo mark — sizing/background is handled by the
// consistent wrapper in the list below so every row lines up regardless
// of each platform's source logo dimensions.
function getPlatformIcon(platform: PlatformName) {
  switch (platform) {
    case PlatformName.HIRIST:
      return (
        <img
          src="/sourcing_platform_icons/hirist.svg"
          alt="Hirist"
          className="h-3.5 w-auto"
        />
      );

    case PlatformName.LINKEDIN:
      return (
        <img
          src="/sourcing_platform_icons/linked_in.svg"
          alt="LinkedIn"
          className="h-4 w-4"
        />
      );

    case PlatformName.NAUKRI:
      return (
        <img
          src="/sourcing_platform_icons/naukri.svg"
          alt="Naukri"
          className="h-3.5 w-auto"
        />
      );

    case PlatformName.IIMJOBS:
      return (
        <img
          src="/sourcing_platform_icons/iimjobs.svg"
          alt="IIMJobs"
          className="h-4 w-4"
        />
      );

    default:
      return null;
  }
}


function isJobPosted(platform: SourcingData) {
  if (platform.new_applications_cnt === 0 && platform.total_fetched_applications == 0) {
    return false;
  }

  return true;
}


export function SourcingModal({
  screening_id,
  onClose,
}: SourcingModalProps) {
  async function handleFetchApplications(platform: PlatformName) {
    try {
      // const sourcedResumes = await getSourcedResumes(screening_id, platform);
      // if (sourcedResumes && sourcedResumes.length > 0) {
      //   toast.success(`Successfully fetched ${sourcedResumes.length} sourced resumes.`);
      //   queryClient.invalidateQueries({ queryKey: ["screening", screening_id] });
      // } else {
      //   toast.error("No sourced resumes found.");
      // }
    } catch (error) {
      console.log("Error fetching sourced resumes:", error);
      toast.error("Error fetching sourced resumes.");
    }
  }
  // api call here

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/30 animate-in fade-in duration-150"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white border border-[#E8E5DF] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white px-5 py-3.5 border-b border-[#E8E5DF] flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-sm font-semibold text-[#0F0F0F]">Job Sourcing Platforms</h2>
          <button
            onClick={onClose}
            className="h-6 w-6 rounded-md hover:bg-[#F5F3EE] flex items-center justify-center text-[#737373]"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
          </button>
        </div>

        <div className="px-3 py-3 flex flex-col gap-2">
          {sourcingData.map((platform) => (
            <div
              key={platform.platform}
              className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${platform.platform === PlatformName.HIRIST
                    ? "bg-black"
                    : "bg-[#F5F3EE]"
                    }`}
                >
                  {getPlatformIcon(platform.platform)}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">
                    {platform.platform}
                  </p>
                  {platform.last_fetched_at &&
                    <p className="text-xs text-muted-foreground leading-tight">
                      Last fetched{" "}
                      {formatDistanceToNowStrict(
                        new Date(platform.last_fetched_at),
                        { addSuffix: true }
                      )}
                    </p>
                  }
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    New
                  </p>

                  <p className="text-sm font-semibold text-green-600">
                    {platform.new_applications_cnt}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Total
                  </p>

                  <p className="text-sm font-semibold">
                    {platform.total_fetched_applications}
                  </p>
                </div>

                <Button
                  disabled={platform.new_applications_cnt === 0 && platform.total_fetched_applications > 0}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() =>
                    handleFetchApplications(platform.platform)
                  }
                >
                  {
                    isJobPosted(platform) ? "Fetch new" : "Post job"
                  }
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}