import { QueryClient } from "@tanstack/react-query";

// Create a client with default configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 1000 * 60 * 5,
      // Keep data in cache for 10 minutes after unused
      gcTime: 1000 * 60 * 10,
      // Don't refetch on window focus by default for wallet data
      refetchOnWindowFocus: false,
      // Retry failed requests 3 times
      retry: 3,
      // Exponential backoff for retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});
