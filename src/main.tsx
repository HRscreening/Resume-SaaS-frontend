import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { initAuth } from "@/lib/auth";
import { App } from "@/App";
import "@/globals.css";

// Start auth hydration immediately — reads from localStorage, no network call.
// By the time React renders, the session is already cached in memory.
initAuth();

// If Supabase redirects the OAuth token to the root (/#access_token=...),
// forward to /auth/callback so the callback component can handle it.
if (window.location.hash.includes("access_token=") && window.location.pathname !== "/auth/callback") {
  window.location.replace("/auth/callback" + window.location.hash);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
