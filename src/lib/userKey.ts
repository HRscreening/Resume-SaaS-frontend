/**
 * User-scoped React Query keys.
 *
 * Why: a user's data must NEVER bleed across accounts. When User A signs out
 * and User B signs in (common in shared browsers / Chrome with multiple Google
 * accounts), the React Query cache from User A would otherwise leak into User
 * B's UI for one render cycle until refetches arrive. That's both a UX bug
 * (wrong quota / wrong screenings flash) and a privacy bug (User B might
 * briefly see User A's resume contents on a deep link).
 *
 * Two layers of defense:
 *   Layer 1 (this file): every user-scoped query key includes userId at the
 *                        end. Different users get cache entries that are
 *                        physically distinct — User B's component literally
 *                        cannot read User A's cache slot, even by accident.
 *
 *   Layer 2 (queryClient.ts): on SIGNED_OUT or user-id change, the entire
 *                             cache is cleared so stale entries don't linger
 *                             in memory until gcTime expires.
 *
 * Invariant: invalidateQueries(["usage"]) still works without changes, because
 * TanStack Query does prefix matching by default — ["usage"] matches
 * ["usage", anyUserId].
 */
import { useAuth } from "@/hooks/useAuth";
import { getCachedUser } from "@/lib/auth";

const ANON = "__anon__";

/**
 * Hook variant for use inside React components.
 * Returns a stable-by-value queryKey: [prefix, ...rest, userId].
 */
export function useUserKey(
  prefix: string,
  ...rest: readonly unknown[]
): readonly unknown[] {
  const { user } = useAuth();
  return [prefix, ...rest, user?.id ?? ANON] as const;
}

/**
 * Synchronous variant for callers outside the React tree (prefetch in event
 * handlers, queryClient ops in route loaders, etc.). Reads the cached user.
 */
export function userKey(
  prefix: string,
  ...rest: readonly unknown[]
): readonly unknown[] {
  return [prefix, ...rest, getCachedUser()?.id ?? ANON] as const;
}
