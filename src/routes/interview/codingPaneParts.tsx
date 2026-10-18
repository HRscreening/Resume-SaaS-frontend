import { Loader2 } from "lucide-react";

import type { InterviewLanguage } from "@/lib/interviewApi";
import { formatCountdown } from "./useCountdown";

// Small presentational pieces shared by the coding pane and its console.

const LANGUAGES: { value: InterviewLanguage; label: string }[] = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "cpp", label: "C++" },
];

export function timerBadgeClasses(warning: boolean, reducedMotion: boolean): string {
  if (!warning) return "bg-[#F0EEE6] text-[#404040]";
  return reducedMotion ? "bg-[#FDE2E2] text-[#9B1C1C]" : "bg-[#FDE2E2] text-[#9B1C1C] animate-pulse";
}

export function TimerBadge({
  secondsRemaining,
  warning,
  reducedMotion,
}: {
  secondsRemaining: number;
  warning: boolean;
  reducedMotion: boolean;
}) {
  return (
    <span
      role="timer"
      aria-live="polite"
      className={`text-xs font-semibold tabular-nums px-2.5 py-1 rounded-full whitespace-nowrap ${timerBadgeClasses(warning, reducedMotion)}`}
    >
      {formatCountdown(secondsRemaining)} left
    </span>
  );
}

export function Banner({
  tone,
  children,
}: {
  tone: "warning" | "success" | "error";
  children: React.ReactNode;
}) {
  const classes =
    tone === "warning"
      ? "bg-[#FDECD2] text-[#8A4B08] border-[#F3D8A8]"
      : tone === "success"
        ? "bg-[#E7F5EC] text-[#166534] border-[#BBE5CA]"
        : "bg-red-50 text-red-700 border-red-200";
  return <div className={`rounded-lg border px-3 py-2 text-xs font-medium ${classes}`}>{children}</div>;
}

export function LabelledCode({
  label,
  value,
  tone = "plain",
}: {
  label: string;
  value: string;
  tone?: "plain" | "error";
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8A8A8A] mb-1">{label}</p>
      <pre
        className={`text-xs font-mono whitespace-pre-wrap break-words rounded border px-2 py-1.5 ${
          tone === "error" ? "bg-white border-red-200 text-red-700" : "bg-white border-[#E8E5DF] text-[#0F0F0F]"
        }`}
      >
        {value}
      </pre>
    </div>
  );
}

export function LanguagePicker({
  value,
  onChange,
  disabled,
}: {
  value: InterviewLanguage;
  onChange: (language: InterviewLanguage) => void;
  disabled: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Language"
      title={disabled ? "Wait for the current run to finish before switching languages." : undefined}
      className="inline-flex rounded-lg border border-[#D4D4D4] bg-white p-0.5"
    >
      {LANGUAGES.map((lang) => (
        <button
          key={lang.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(lang.value)}
          aria-pressed={value === lang.value}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
            value === lang.value ? "bg-[#0F0F0F] text-white" : "text-[#404040] hover:bg-[#F5F3EE]"
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}

export function ActionButton({
  onClick,
  disabled,
  label,
  loading,
  primary,
  disabledReason,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  loading: boolean;
  primary?: boolean;
  disabledReason: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      className={`h-8 px-3 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none ${
        primary
          ? "bg-[#0F0F0F] text-white hover:bg-[#1C1C1C]"
          : "border border-[#D4D4D4] bg-white text-[#404040] hover:bg-[#F5F3EE]"
      }`}
    >
      {loading && <Loader2 className="h-3 w-3 animate-spin" />}
      {label}
    </button>
  );
}
