import { format, isToday, isYesterday, formatDistanceToNowStrict } from "date-fns";


export function formatAppliedDate(date: string) {
  const appliedDate = new Date(date);

  if (isToday(appliedDate)) {
    return "Today";
  }

  if (isYesterday(appliedDate)) {
    return "Yesterday";
  }

  const daysAgo = formatDistanceToNowStrict(appliedDate);

  if (daysAgo.includes("day")) {
    return `${daysAgo} ago`;
  }

  return format(appliedDate, "dd MMM yyyy");
}