/**
 * Centralized auth token cache.
 *
 * Why this is secure:
 * - Tokens are JWTs validated server-side on every API request (backend checks signature + expiry)
 * - Client-side caching is purely a performance optimization — it does NOT bypass security
 * - Token is refreshed automatically when within 60s of expiry
 * - On sign-out, the cache is cleared
 * - If a cached token is somehow stale, the backend rejects it with 401 and the UI redirects to login
 *
 * This is the same approach used by Auth0, Firebase, and Clerk SDKs.
 */
import { createClient } from "@/lib/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

const TOKEN_REFRESH_MARGIN_S = 60; // refresh 60s before expiry

let _cachedSession: Session | null = null;
let _initialLoadDone = false;
let _initialLoadPromise: Promise<void> | null = null;

/**
 * Initialize auth state from Supabase's local storage.
 * Called once on app startup. Subsequent calls are no-ops.
 */
export function initAuth(): Promise<void> {
  if (_initialLoadPromise) return _initialLoadPromise;

  _initialLoadPromise = (async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    _cachedSession = session;
    _initialLoadDone = true;

    // Keep cache in sync with auth state changes (login, logout, token refresh)
    supabase.auth.onAuthStateChange((_event, session) => {
      _cachedSession = session;
    });
  })();

  return _initialLoadPromise;
}

/**
 * Get a valid access token. Returns from cache if not expired.
 * Refreshes automatically if within TOKEN_REFRESH_MARGIN_S of expiry.
 * Throws if not authenticated.
 */
export async function getAccessToken(): Promise<string> {
  // Ensure initial load is done
  if (!_initialLoadDone) await initAuth();

  if (_cachedSession) {
    const expiresAt = _cachedSession.expires_at ?? 0;
    const now = Math.floor(Date.now() / 1000);

    // Token still valid and not near expiry — use cached
    if (expiresAt - now > TOKEN_REFRESH_MARGIN_S) {
      return _cachedSession.access_token;
    }

    // Token near expiry — refresh in background, return current token
    // The refresh updates _cachedSession via onAuthStateChange
    if (expiresAt > now) {
      const supabase = createClient();
      supabase.auth.refreshSession().catch(() => {
        // Refresh failed — will be caught on next call if token expired
      });
      return _cachedSession.access_token;
    }

    // Token expired — must refresh synchronously
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error || !session) {
      _cachedSession = null;
      throw new Error("Not authenticated");
    }
    _cachedSession = session;
    return session.access_token;
  }

  throw new Error("Not authenticated");
}

/**
 * Get the current user from cached session. No network call.
 */
export function getCachedUser(): User | null {
  return _cachedSession?.user ?? null;
}

/**
 * Check if there's an active session. No network call.
 */
export function isAuthenticated(): boolean {
  return _cachedSession !== null;
}

/**
 * Clear the cached session (call on sign-out).
 */
export function clearAuthCache(): void {
  _cachedSession = null;
}
