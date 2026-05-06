import type { FileProgress } from "@/types";

export const STAGE_CONFIG: Record<
  string,
  { label: string; color: string; icon: "spin" | "check" | "error" | "wait" }
> = {
  queued:  { label: "Waiting",  color: "text-[#A0A0A0]", icon: "wait"  },
  parsing: { label: "Parsing",  color: "text-blue-600",  icon: "spin"  },
  parsed:  { label: "Parsed",   color: "text-blue-600",  icon: "spin"  },
  scoring: { label: "Scoring",  color: "text-amber-600", icon: "spin"  },
  scored:  { label: "Done",     color: "text-green-700", icon: "check" },
  error:   { label: "Failed",   color: "text-red-600",   icon: "error" },
};

export function PendingResumeRow({ file }: { file: FileProgress }) {
  const config = STAGE_CONFIG[file.stage] ?? STAGE_CONFIG.queued;
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="h-8 w-8 rounded-full bg-[#F0EDE8] flex items-center justify-center shrink-0">
        {config.icon === "spin" && <div className="h-3.5 w-3.5 rounded-full border-2 border-[#A0A0A0] border-t-transparent animate-spin" />}
        {config.icon === "wait" && <div className="h-2 w-2 rounded-full bg-[#D4D4D4]" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#737373] truncate">{file.filename}</p>
        <div className="h-2 bg-[#E8E5DF] rounded-full animate-pulse w-1/3 mt-1.5" />
      </div>
      <span className={`text-xs font-medium ${config.color} shrink-0`}>{config.label}</span>
      {(file.stage === "parsing" || file.stage === "scoring") && (
        <span className="flex gap-0.5 shrink-0 ml-1">
          {[0, 200, 400].map((d) => (
            <span key={d} className="h-1 w-1 rounded-full bg-[#A0A0A0] animate-pulse" style={{ animationDelay: `${d}ms` }} />
          ))}
        </span>
      )}
    </div>
  );
}
