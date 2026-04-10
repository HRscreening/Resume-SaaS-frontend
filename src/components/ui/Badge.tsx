import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "plan-free"
  | "plan-pro"
  | "plan-business"
  | "plan-enterprise";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-[#F5F3EE] text-[#404040] border border-[#D4D4D4]",
  success: "bg-green-50 text-green-700 border border-green-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  error: "bg-red-50 text-red-700 border border-red-200",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
  "plan-free": "bg-[#F5F3EE] text-[#404040] border border-[#D4D4D4]",
  "plan-pro": "bg-blue-50 text-blue-700 border border-blue-200",
  "plan-business": "bg-purple-50 text-purple-700 border border-purple-200",
  "plan-enterprise":
    "bg-[#C85A1710] text-[#C85A17] border border-[#C85A1740]",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    completed: "success",
    processing: "info",
    pending: "default",
    failed: "error",
    scored: "success",
    scoring: "info",
    parsed: "default",
    parsing: "info",
    extracting: "info",
    extracted: "default",
  };

  const labels: Record<string, string> = {
    completed: "Completed",
    processing: "Processing",
    pending: "Pending",
    failed: "Failed",
    scored: "Scored",
    scoring: "Scoring…",
    parsed: "Parsed",
    parsing: "Parsing…",
    extracting: "Extracting…",
    extracted: "Extracted",
  };

  return (
    <Badge variant={map[status] ?? "default"}>
      {labels[status] ?? status}
    </Badge>
  );
}

export function PlanBadge({ plan }: { plan: string }) {
  const variant = `plan-${plan.toLowerCase()}` as BadgeVariant;
  return <Badge variant={variant}>{plan}</Badge>;
}
