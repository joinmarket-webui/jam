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
  delayOptions: WithQueryDelayOptions,
): QueryFunction<TQueryFnData, TQueryKey> | undefined {
  if (queryFn === undefined) return undefined
  return (async (context) => {
    return await applyDelay(async () => await queryFn(context), delayOptions)
  }) as QueryFunction<TQueryFnData, TQueryKey>
}

export function withMutationDelay<TMutateFnData, TVariables = void>(
  queryFn: MutationFunction<TMutateFnData, TVariables>,
  delayOptions: WithQueryDelayOptions,
): MutationFunction<TMutateFnData, TVariables> {
  return (async (variables, options) => {
    return await applyDelay(async () => await queryFn(variables, options), delayOptions)
  }) as MutationFunction<TMutateFnData, TVariables>
}

async function applyDelay<T>(
  queryFn: () => Promise<T>,
  { delayBefore, delayAfter, throttle }: WithQueryDelayOptions,
): Promise<T> {
  const now = globalThis.performance.now()
  if (delayBefore !== undefined && delayBefore > 0) {
    await delayedPromise(delayBefore)
  }
  const result = await queryFn()
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
}
