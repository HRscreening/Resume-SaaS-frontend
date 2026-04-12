import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,   // 5 min — data stays fresh, no refetch on navigation
      gcTime: 10 * 60_000,     // 10 min — keep unused cache longer for back-nav
      retry: 1,
      refetchOnWindowFocus: false, // stop refetching every time user alt-tabs
    },
  },
});
