import { QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,   // 5 min — data stays fresh, no refetch on navigation
      gcTime: 10 * 60_000,     // 10 min — keep unused cache longer for back-nav
      retry: 1,
      refetchOnWindowFocus: false, // stop refetching every time user alt-tabs
    },
  },
});

// ─── Multi-account cache hygiene ─────────────────────────────────────────────
// Subscribe ONCE at module load. Two security boundaries trigger a full clear:
//   1. SIGNED_OUT — the previous user's data must not survive logout. The next
//      person at this browser (different Google account) gets a clean slate.
//   2. SIGNED_IN with a different user id from the previous session — same
//      tab swapped users without a logout (rare, but possible via Supabase
//      multi-tab session sync). Treat as a hard boundary.
//
// TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY: same user, no clear.
//
// User-scoped query keys (lib/userKey.ts) provide the strong guarantee — User
// B cannot accidentally read User A's cache entries because the keys are
// physically distinct. This subscription is hygiene: it reclaims memory and
// prevents a 10-minute gcTime window of stale data lingering in RAM.
if (typeof window !== "undefined") {
  let lastSeenUserId: string | null = null;
  const supabase = createClient();

  // Capture the initial user id BEFORE any onAuthStateChange events fire so
  // the first SIGNED_IN event after a tab switch is correctly identified as
  // either same-user (no clear) or different-user (clear).
  supabase.auth.getSession().then(({ data }) => {
    lastSeenUserId = data.session?.user?.id ?? null;
  });

  supabase.auth.onAuthStateChange((event, session) => {
    const newId = session?.user?.id ?? null;

    if (event === "SIGNED_OUT") {
      queryClient.clear();
      lastSeenUserId = null;
      return;
    }

    if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
      if (lastSeenUserId !== null && newId !== lastSeenUserId) {
        // Same browser, different account — privacy boundary.
        queryClient.clear();
      }
      lastSeenUserId = newId;
      return;
    }
    // Other events (TOKEN_REFRESHED, USER_UPDATED) keep the cache intact.
  });
}
