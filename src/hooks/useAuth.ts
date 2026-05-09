import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { initAuth, getCachedUser, isInitialized } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  loading: boolean;
}

/**
 * Returns the current authenticated user from the in-memory cache.
 *
 * `main.tsx` awaits `initAuth()` BEFORE first render, so on every component
 * mount that happens during normal app operation the cache is already
 * hydrated and we can return synchronously — no spinner flash.
 *
 * The `loading` state only ever surfaces in the unusual case where useAuth
 * is called before `initAuth()` has resolved (defensive — shouldn't happen).
 * Subsequent auth events (login/logout/refresh) come via onAuthStateChange.
 *
 * Security: This is for UI routing only. The backend validates the JWT
 * on every API request — that's the real security boundary.
 */
export function useAuth(): AuthState {
  // Lazy initializers run once on first render — synchronous reads from the
  // module-level cache that `main.tsx` already hydrated.
  const [user, setUser] = useState<User | null>(() => getCachedUser());
  const [loading, setLoading] = useState<boolean>(() => !isInitialized());

  useEffect(() => {
    let cancelled = false;

    // Defensive: if for some reason useAuth was called before initAuth
    // resolved, finish hydration before subscribing.
    if (!isInitialized()) {
      initAuth().then(() => {
        if (!cancelled) {
          setUser(getCachedUser());
          setLoading(false);
        }
      });
    }

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!cancelled) {
          setUser(session?.user ?? null);
          setLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
