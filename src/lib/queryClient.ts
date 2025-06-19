import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1_000 * 60 * 5,
      gcTime: 1_000 * 60 * 10,
      refetchOnWindowFocus: false,
      retryDelay: (attemptIndex) => Math.min(1_000 * 2 ** attemptIndex, 30_000),
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
})
