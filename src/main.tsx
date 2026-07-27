import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { initAuth } from "@/lib/auth";
import { App } from "@/App";
import "@/globals.css";
import { TooltipProvider } from "./components/ui/tooltip";
// If Supabase redirects the OAuth token to the root (/#access_token=...),
// forward to /auth/callback so the callback component can handle it.
if (window.location.hash.includes("access_token=") && window.location.pathname !== "/auth/callback") {
  window.location.replace("/auth/callback" + window.location.hash);
}

// Hydrate auth from localStorage BEFORE first render so AuthGuard
// never flashes a loading spinner for logged-in users.
initAuth().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
        <App />
        </TooltipProvider>
        {import.meta.env.VITE_ENVIROMENT === "Development" && true && (<ReactQueryDevtools initialIsOpen={false} />)}
      </QueryClientProvider>
    </StrictMode> 
  );
});
