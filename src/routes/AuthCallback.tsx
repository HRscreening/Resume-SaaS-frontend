import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { createClient } from "@/lib/supabase/client";
import { initAuth } from "@/lib/auth";
import { getProfile } from "@/lib/api";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const supabase = createClient();

    // Single path: listen for SIGNED_IN from the hash/code exchange.
    // Supabase SDK auto-detects tokens in the URL and fires this event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          subscription.unsubscribe();
          // Re-hydrate the auth cache so AuthGuard picks up the session instantly
          await initAuth();
          await redirectAfterAuth();
        }
      }
    );

    // Timeout: if nothing happens in 8s, redirect to login
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      navigate({ to: "/login" });
    }, 8000);

    async function redirectAfterAuth() {
      clearTimeout(timeout);
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") ?? "/dashboard";

      try {
        const profile = await getProfile();
        navigate({ to: profile.onboarding_completed ? next : "/onboarding" });
      } catch {
        navigate({ to: next });
      }
    }

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
