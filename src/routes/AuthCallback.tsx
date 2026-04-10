import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { createClient } from "@/lib/supabase/client";
import { getProfile } from "@/lib/api";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const supabase = createClient();

    // Supabase auto-detects tokens in the URL hash (implicit flow)
    // or code in query params (PKCE flow). Listen for the session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          await redirectAfterAuth();
        }
      }
    );

    // Also check if session already exists (tokens were already exchanged)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        await redirectAfterAuth();
      } else {
        // If no session after a short wait, something went wrong
        setTimeout(() => {
          navigate({ to: "/login", search: { error: "auth_callback_failed" } });
        }, 5000);
      }
    });

    async function redirectAfterAuth() {
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") ?? "/dashboard";

      try {
        const profile = await getProfile();
        const destination = profile.onboarding_completed ? next : "/onboarding";
        navigate({ to: destination });
      } catch {
        navigate({ to: next });
      }
    }

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F5F3EE" }}>
      <div className="text-center">
        <div className="h-6 w-6 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-sm text-[#737373]">Signing you in…</p>
      </div>
    </div>
  );
}
