import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function scoreColor(score: number): string {
  if (score >= 75) return "text-green-700";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

export function scoreBgColor(score: number): string {
  if (score >= 75) return "bg-green-50 border-green-200";
  if (score >= 50) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

export function scoreLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Good";
  if (score >= 40) return "Fair";
  return "Weak";
}

export function confidenceColor(confidence: "high" | "medium" | "low"): string {
  const map = {
    high: "text-green-700 bg-green-50",
    medium: "text-amber-700 bg-amber-50",
    low: "text-red-700 bg-red-50",
  };
  return map[confidence];
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeDate(iso: string): string {
  const now = new Date();
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(iso);
}

export function planLimits(plan: string): number {
  const limits: Record<string, number> = {
    FREE: 50,
    PRO: 500,
    BUSINESS: 2000,
    ENTERPRISE: Infinity,
  };
  return limits[plan] ?? 50;
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}
