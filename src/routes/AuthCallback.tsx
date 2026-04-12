import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { createClient } from "@/lib/supabase/client";
import { initAuth, isAuthenticated } from "@/lib/auth";
import { getProfile } from "@/lib/api";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const supabase = createClient();

    async function redirectAfterAuth() {
      // Re-hydrate auth cache so AuthGuard picks up session instantly
      await initAuth();
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") ?? "/dashboard";
      try {
        const profile = await getProfile();
        navigate({ to: profile.onboarding_completed ? next : "/onboarding" });
      } catch {
        navigate({ to: next });
      }
    }

    // Case 1: initAuth() already exchanged the tokens from the URL hash
    // before this component mounted. Session exists — redirect now.
    if (isAuthenticated()) {
      redirectAfterAuth();
      return;
    }

    // Case 2: tokens not yet exchanged. Wait for Supabase SDK to pick them up.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
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
