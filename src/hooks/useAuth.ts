import { useState, useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { initAuth, getCachedUser } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  loading: boolean;
}

/**
 * Returns the current authenticated user from the in-memory cache.
 *
 * On first call, waits for initAuth() to hydrate from Supabase's local storage.
 * After that, returns instantly (no network calls).
 * Subscribes to auth state changes (login/logout/refresh) to stay in sync.
 *
 * Security: This is for UI routing only. The backend validates the JWT
 * on every API request — that's the real security boundary.
 */
export function useAuth(): AuthState {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Hydrate from Supabase's local storage (fast — reads localStorage, not network)
    initAuth().then(() => {
      if (!cancelled) {
        setUser(getCachedUser());
        setLoading(false);
      }
    });

    // Stay in sync with auth changes
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
