import { QueryClient } from '@tanstack/react-query'
import type { QueryFunction, QueryKey } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retryDelay: (attemptIndex) => Math.min(1_000 * 2 ** attemptIndex, 30_000),
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
})

export function withQueryDelay<TQueryFnData, TQueryKey extends QueryKey>(
  queryFn: QueryFunction<TQueryFnData, TQueryKey> | undefined,
  delayMs: number,
): QueryFunction<TQueryFnData, TQueryKey> | undefined {
  if (!queryFn) return undefined
  return (async (context) => {
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
    return queryFn(context)
  }) as QueryFunction<TQueryFnData, TQueryKey>
}
