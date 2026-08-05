
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

  if (isToday(appliedDate)) {
    return "Today";
  }

  if (isYesterday(appliedDate)) {
    return "Yesterday";
  }

  const days = differenceInDays(new Date(), appliedDate);

  // Up to 90 days
  if (days <= 90) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  const months = differenceInMonths(new Date(), appliedDate);

  // Up to 12 months
  if (months < 12) {
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }

  const years = differenceInYears(new Date(), appliedDate);

  return `${years} year${years === 1 ? "" : "s"} ago`;
}



export function ExactDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}