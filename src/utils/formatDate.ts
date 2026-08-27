
import {
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  format,
  isToday,
  isYesterday,
} from "date-fns";



export function formatRelativeDate(date: string) {
  const appliedDate = new Date(date);
  const now = new Date();

  const diffMs = now.getTime() - appliedDate.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (isYesterday(appliedDate)) {
    return "Yesterday";
  }

  if (days <= 90) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  const months = differenceInMonths(now, appliedDate);

  if (months < 12) {
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }

  const years = differenceInYears(now, appliedDate);

  return `${years} year${years === 1 ? "" : "s"} ago`;
}



export function ExactDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}