import { QueryClient } from '@tanstack/react-query'
import type { MutationFunction, QueryFunction, QueryKey } from '@tanstack/react-query'
import { delayedPromise } from './utils'

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

type WithQueryDelayOptions = {
  delayBefore?: number
  delayAfter?: number
}

export function withQueryDelay<TQueryFnData, TQueryKey extends QueryKey>(
  queryFn: QueryFunction<TQueryFnData, TQueryKey> | undefined,
  { delayBefore, delayAfter }: WithQueryDelayOptions,
): QueryFunction<TQueryFnData, TQueryKey> | undefined {
  if (!queryFn) return undefined
  return (async (context) => {
    if (delayBefore !== undefined && delayBefore > 0 && !context.signal.aborted) {
      await delayedPromise(delayBefore)
    }
    const result = queryFn(context)
    if (delayAfter !== undefined && delayAfter > 0 && !context.signal.aborted) {
      await delayedPromise(delayAfter)
    }
    return result
  }) as QueryFunction<TQueryFnData, TQueryKey>
}

export function withMutationDelay<TMutateFnData, TVariables = void>(
  queryFn: MutationFunction<TMutateFnData, TVariables> | undefined,
  { delayBefore, delayAfter }: WithQueryDelayOptions,
): MutationFunction<TMutateFnData, TVariables> | undefined {
  if (!queryFn) return undefined
  return (async (variables, options) => {
    if (delayBefore !== undefined && delayBefore > 0) {
      await delayedPromise(delayBefore)
    }
    const result = queryFn(variables, options)
    if (delayAfter !== undefined && delayAfter > 0) {
      await delayedPromise(delayAfter)
    }
    return result
  }) as MutationFunction<TMutateFnData, TVariables>
}
