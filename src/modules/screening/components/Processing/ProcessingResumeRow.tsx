import type { ResumeParsingBodyType, STAGE_CONFIG_TYPE } from "@/modules/screening/types/progress.type";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import React from "react";


export const PARSING_STAGE_CONFIG: STAGE_CONFIG_TYPE = {
  unknown: { label: "Unknown", color: "text-neutral-400", icon: "wait" },
  queued: { label: "Waiting", color: "text-neutral-400", icon: "wait" },
  QUEUED: { label: "Waiting", color: "text-neutral-400", icon: "wait" },
  retry: { label: "Retrying", color: "text-amber-500", icon: "wait" },
  RETRY: { label: "Retrying", color: "text-amber-500", icon: "wait" },
  PARSING_IN_PROGRESS: { label: "Reading resume", color: "text-blue-500", icon: "spin" },
  processing: { label: "Reading resume", color: "text-blue-500", icon: "spin" },
  details: { label: "Extracting details", color: "text-indigo-500", icon: "spin" },
  profile: { label: "Preparing profile", color: "text-violet-500", icon: "spin" },
  success: { label: "Parsed", color: "text-emerald-500", icon: "check" },
  SUCCESS: { label: "Parsed", color: "text-emerald-500", icon: "check" },
  PARSED: { label: "Parsed", color: "text-emerald-500", icon: "check" },
  error: { label: "Failed", color: "text-rose-500", icon: "error" },
  ERROR: { label: "Failed", color: "text-rose-500", icon: "error" },
};

export const SCORING_STAGE_CONFIG: STAGE_CONFIG_TYPE = {
  queued: { label: "Waiting", color: "text-neutral-400", icon: "wait" },
  QUEUED: { label: "Waiting", color: "text-neutral-400", icon: "wait" },
  retry: { label: "Retrying", color: "text-amber-500", icon: "wait" },
  RETRY: { label: "Retrying", color: "text-amber-500", icon: "wait" },
  SCORING_IN_PROGRESS: { label: "Starting scoring", color: "text-blue-500", icon: "spin" },
  scoring_in_progress: { label: "Starting scoring", color: "text-blue-500", icon: "spin" },
  processing: { label: "Starting scoring", color: "text-blue-500", icon: "spin" },
  PROCESSING: { label: "Starting scoring", color: "text-blue-500", icon: "spin" },
  analyzing_profile: { label: "Analyzing profile", color: "text-cyan-500", icon: "spin" },
  ANALYZING_PROFILE: { label: "Analyzing profile", color: "text-cyan-500", icon: "spin" },
  evaluating_criteria: { label: "Evaluating criteria", color: "text-indigo-500", icon: "spin" },
  EVALUATING_CRITERIA: { label: "Evaluating criteria", color: "text-indigo-500", icon: "spin" },
  calculating_score: { label: "Calculating score", color: "text-violet-500", icon: "spin" },
  CALCULATING_SCORE: { label: "Calculating score", color: "text-violet-500", icon: "spin" },
  success: { label: "Scored", color: "text-emerald-500", icon: "check" },
  SUCCESS: { label: "Scored", color: "text-emerald-500", icon: "check" },
  scored: { label: "Scored", color: "text-emerald-500", icon: "check" },
  SCORED: { label: "Scored", color: "text-emerald-500", icon: "check" },
  error: { label: "Scoring failed", color: "text-rose-500", icon: "error" },
  ERROR: { label: "Scoring failed", color: "text-rose-500", icon: "error" },
  failed: { label: "Scoring failed", color: "text-rose-500", icon: "error" },
  FAILED: { label: "Scoring failed", color: "text-rose-500", icon: "error" },
};

export function PendingResumeRowComp({ file, type = 'Parsing' }: { file: ResumeParsingBodyType, type: 'Parsing' | 'Scoring' }) {
  const statusKey = file.status;
  const config = type === 'Parsing'
    ? PARSING_STAGE_CONFIG[statusKey] ?? PARSING_STAGE_CONFIG[statusKey.toLowerCase()] ?? PARSING_STAGE_CONFIG[statusKey.toUpperCase()] ?? PARSING_STAGE_CONFIG.queued
    : SCORING_STAGE_CONFIG[statusKey] ?? SCORING_STAGE_CONFIG[statusKey.toLowerCase()] ?? SCORING_STAGE_CONFIG[statusKey.toUpperCase()] ?? SCORING_STAGE_CONFIG.queued;

  const bgClass = config.icon === "check" ? "bg-emerald-50"
    : config.icon === "error" ? "bg-rose-50"
      : config.icon === "spin" ? "bg-blue-50"
        : "bg-neutral-50";

  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className={`h-8 w-8 rounded-full ${bgClass} flex items-center justify-center shrink-0`}>
        {config.icon === "spin" && <Loader2 className={`h-4 w-4 ${config.color} animate-spin`} />}
        {config.icon === "check" && <CheckCircle2 className={`h-4 w-4 ${config.color}`} />}
        {config.icon === "error" && <XCircle className={`h-4 w-4 ${config.color}`} />}
        {config.icon === "wait" && <Clock className={`h-4 w-4 ${config.color}`} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-700 truncate">{file.filename}</p>
        <div className="h-1.5 bg-neutral-100 rounded-full animate-pulse w-1/3 mt-1.5" />
      </div>
      <span className={`text-xs font-semibold ${config.color} shrink-0`}>{config.label}</span>
      {(file.status === "QUEUED" || file.status === "queued") && (
        <span className="flex gap-0.5 shrink-0 ml-1">
          {[0, 200, 400].map((d) => (
            <span key={d} className="h-1 w-1 rounded-full bg-neutral-400 animate-pulse" style={{ animationDelay: `${d}ms` }} />
          ))}
        </span>
      )}
    </div>
  );
}


export const PendingResumeRow = React.memo(PendingResumeRowComp);

