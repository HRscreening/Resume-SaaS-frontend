import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0–100
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
  color?: "default" | "success" | "warning" | "error";
}

const colorMap = {
  default: "bg-[#0F0F0F]",
  success: "bg-green-600",
  warning: "bg-amber-500",
  error: "bg-red-600",
};

export function ProgressBar({
  value,
  className,
  showLabel = false,
  size = "md",
  color = "default",
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "w-full rounded-full bg-[#E8E5DF] overflow-hidden",
          size === "sm" ? "h-1.5" : "h-2.5"
        )}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", colorMap[color])}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-xs text-[#737373]">{clamped}%</p>
      )}
    </div>
  );
}

export function ScoreRing({
  score,
  size = 56,
}: {
  score: number;
  size?: number;
}) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = ((score / 100) * circ);

  let strokeColor = "#DC2626";
  if (score >= 75) strokeColor = "#16A34A";
  else if (score >= 50) strokeColor = "#D97706";

  return (
    <svg width={size} height={size} className="-rotate-90" aria-label={`Score: ${score}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#E8E5DF"
        strokeWidth={6}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={strokeColor}
        strokeWidth={6}
        strokeDasharray={circ}
        strokeDashoffset={circ - fill}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}
