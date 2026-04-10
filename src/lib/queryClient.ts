import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s before refetch in background
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});
