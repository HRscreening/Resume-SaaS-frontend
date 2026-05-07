import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { createClient } from "@/lib/supabase/client";
import { initAuth, isAuthenticated } from "@/lib/auth";
import { getProfile } from "@/lib/api";
import { safeNext } from "@/lib/utils";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const supabase = createClient();

    const params = new URLSearchParams(window.location.search);
    const rawNext = params.get("next") ?? "/dashboard";
    const isPasswordReset = rawNext === "/reset-password";
    // An explicit, non-default `next` (e.g. /checkout/...) means the user
    // came from a specific protected page — honor it directly and skip the
    // onboarding gate. Plain logins (next = /dashboard) keep the gate.
    const explicitNext =
      rawNext !== "/dashboard" && rawNext !== "/onboarding"
        ? safeNext(rawNext)
        : null;

    function goTo(target: string) {
      // `target` may include a query string (e.g. /checkout/pro?cycle=yearly)
      // which TanStack's navigate({to}) doesn't parse — use a full redirect.
      if (target.includes("?")) window.location.replace(target);
      else navigate({ to: target });
    }

    async function redirectAfterAuth() {
      // Re-hydrate auth cache so AuthGuard picks up session instantly
      await initAuth();
      // Password-reset links land here with a recovery session — the user
      // must set a new password before going anywhere else.
      if (isPasswordReset) {
        navigate({ to: "/reset-password" });
        return;
      }
      if (explicitNext) {
        goTo(explicitNext);
        return;
      }
      try {
        const profile = await getProfile();
        navigate({ to: profile.onboarding_completed ? "/dashboard" : "/onboarding" });
      } catch {
        navigate({ to: "/dashboard" });
      }
    }

    // Case 1: initAuth() already exchanged the tokens from the URL hash
    // before this component mounted. Session exists — redirect now.
    if (isAuthenticated()) {
      redirectAfterAuth();
      return;
    }

    // Case 2: tokens not yet exchanged. Wait for Supabase SDK to pick them up.
    // PASSWORD_RECOVERY fires on reset-link clicks; SIGNED_IN fires on normal
    // auth callback. Both should redirect — recovery goes to /reset-password.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") && session) {
          subscription.unsubscribe();
          clearTimeout(timeout);
          await redirectAfterAuth();
        }
      }
    );

    // Fallback: if nothing happens in 8s, go to login
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      navigate({ to: "/login" });
    }, 8000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F5F3EE" }}>
      <div className="text-center">
        <div className="h-6 w-6 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-sm text-[#737373]">Signing you in...</p>
      </div>
    </div>
  );
}
