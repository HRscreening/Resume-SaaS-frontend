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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
