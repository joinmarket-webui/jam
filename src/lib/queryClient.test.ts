import type { MutationFunction, QueryFunction } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryClient, withMutationDelay, withQueryDelay } from './queryClient'

describe('queryClient', () => {
  it('should disable retries and window-focus refetching by default', () => {
    const options = queryClient.getDefaultOptions()

    expect(options.queries?.retry).toBe(false)
    expect(options.queries?.refetchOnWindowFocus).toBe(false)
    expect(options.mutations?.retry).toBe(false)
  })

  it('should cap retry delay at 30 seconds', () => {
    const retryDelay = queryClient.getDefaultOptions().queries?.retryDelay
    const getRetryDelay = retryDelay as (failureCount: number, error: Error) => number

    expect(getRetryDelay(0, new Error('first'))).toBe(1_000)
    expect(getRetryDelay(10, new Error('later'))).toBe(30_000)
  })
})

describe('withQueryDelay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(globalThis.performance, 'now').mockImplementation(() => Date.now())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should return undefined when no query function is provided', () => {
    expect(withQueryDelay(undefined, {})).toBeUndefined()
  })

  it('should wrap query functions without changing their result', async () => {
    const queryFn = vi.fn(() => Promise.resolve('ok')) as unknown as QueryFunction<string, readonly ['wallet']>
    const wrapped = withQueryDelay(queryFn, {})!

    await expect(
      wrapped({
        client: queryClient,
        queryKey: ['wallet'],
        signal: new AbortController().signal,
        meta: undefined,
      }),
    ).resolves.toBe('ok')
    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it('should apply before, after, and throttle delays', async () => {
    const queryFn = vi.fn(() => Promise.resolve('delayed')) as unknown as QueryFunction<string, readonly ['wallet']>
    const wrapped = withQueryDelay(queryFn, { delayBefore: 100, delayAfter: 50, throttle: 200 })!
    const result = wrapped({
      client: queryClient,
      queryKey: ['wallet'],
      signal: new AbortController().signal,
      meta: undefined,
    })

    await vi.advanceTimersByTimeAsync(99)
    expect(queryFn).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(queryFn).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(50)
    await vi.advanceTimersByTimeAsync(50)

    await expect(result).resolves.toBe('delayed')
  })
})

describe('withMutationDelay', () => {
  it('should wrap mutation functions without changing their result', async () => {
    const mutationFn = vi.fn((value: number) => Promise.resolve(value + 1)) as unknown as MutationFunction<
      number,
      number
    >
    const wrapped = withMutationDelay(mutationFn, {})
    const context = { client: queryClient, meta: undefined }

    await expect(wrapped(41, context)).resolves.toBe(42)
    expect(mutationFn).toHaveBeenCalledWith(41, context)
  })
})
