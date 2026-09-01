import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/lib/api";

/**
 * Whether the current session is a read-only viewer.
 *
 * The API refuses every write for these sessions, so this exists purely so the
 * UI stops offering actions that cannot succeed — an enabled "New screening"
 * button that 403s on click reads as a broken app rather than a denied one.
 *
 * This is presentation only. It is NOT the access control: hiding a button
 * stops nobody who can open a network tab, and the server-side guard is what
 * actually enforces read-only. Never use it to decide whether something is
 * safe, only whether it is worth showing.
 *
 * Defaults to false while loading, so ordinary sessions never flicker their
 * controls off on a slow profile fetch.
 */
export function useIsViewer(): boolean {
  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    staleTime: 5 * 60_000,
  });
  return data?.is_viewer ?? false;
}
