import { QueryClient } from '@tanstack/react-query'
import type { MutationFunction, QueryFunction, QueryKey } from '@tanstack/react-query'
import type { Milliseconds } from '@/types/global'
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
  delayBefore?: Milliseconds
  delayAfter?: Milliseconds
  throttle?: Milliseconds
}

export function withQueryDelay<TQueryFnData, TQueryKey extends QueryKey>(
  queryFn: QueryFunction<TQueryFnData, TQueryKey> | undefined,
  { delayBefore, delayAfter, throttle }: WithQueryDelayOptions,
): QueryFunction<TQueryFnData, TQueryKey> | undefined {
  if (!queryFn) return undefined
  return (async (context) => {
    const now = globalThis.performance.now()
    if (delayBefore !== undefined && delayBefore > 0 && !context.signal.aborted) {
      await delayedPromise(delayBefore)
    }
    const result = await queryFn(context)
    if (delayAfter !== undefined && delayAfter > 0 && !context.signal.aborted) {
      await delayedPromise(delayAfter)
    }
    if (throttle != undefined && throttle > 0 && !context.signal.aborted) {
      const requestDuration = globalThis.performance.now() - now
      const throttleDelay = Math.max(0, throttle - requestDuration)
      if (throttleDelay > 0) {
        await delayedPromise(throttleDelay)
      }
    }
    return result
  }) as QueryFunction<TQueryFnData, TQueryKey>
}

export function withMutationDelay<TMutateFnData, TVariables = void>(
  queryFn: MutationFunction<TMutateFnData, TVariables> | undefined,
  { delayBefore, delayAfter, throttle }: WithQueryDelayOptions,
): MutationFunction<TMutateFnData, TVariables> | undefined {
  if (!queryFn) return undefined
  return (async (variables, options) => {
    const now = globalThis.performance.now()
    if (delayBefore !== undefined && delayBefore > 0) {
      await delayedPromise(delayBefore)
    }
    const result = await queryFn(variables, options)
    if (delayAfter !== undefined && delayAfter > 0) {
      await delayedPromise(delayAfter)
    }
    if (throttle != undefined && throttle > 0) {
      const requestDuration = globalThis.performance.now() - now
      const throttleDelay = Math.max(0, throttle - requestDuration)
      if (throttleDelay > 0) {
        await delayedPromise(throttleDelay)
      }
    }
    return result
  }) as MutationFunction<TMutateFnData, TVariables>
}
