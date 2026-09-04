import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchLog } from '@/lib/api/jam'
import { authStore } from '@/store/authStore'
import { useJmwalletdStdoutLog } from './useJmwalletdStdoutLog'

type QueryOptions = {
  enabled?: boolean
  queryFn?: (args: { signal: AbortSignal }) => Promise<string>
}

const mocks = vi.hoisted(() => ({
  queryOptions: undefined as QueryOptions | undefined,
  queryResult: {
    data: undefined as string | undefined,
    error: undefined as Error | undefined,
    isFetched: false,
    refetch: vi.fn(),
  },
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn((options: QueryOptions) => {
    mocks.queryOptions = options
    return mocks.queryResult
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { reason?: string }) => (options?.reason ? `${key}:${options.reason}` : key),
  }),
}))

vi.mock('@/lib/api/jam', () => ({
  fetchLog: vi.fn(),
}))

describe('useJmwalletdStdoutLog', () => {
  beforeEach(() => {
    authStore.getState().clear()
    mocks.queryOptions = undefined
    mocks.queryResult.data = undefined
    mocks.queryResult.error = undefined
    mocks.queryResult.isFetched = false
    mocks.queryResult.refetch.mockReset()
    vi.mocked(fetchLog).mockReset()
  })

  it('reports missing authentication as an initialized alert state', () => {
    const { result } = renderHook(() => useJmwalletdStdoutLog())

    expect(result.current.fileName).toBe('jmwalletd_stdout.log')
    expect(result.current.isInitialized).toBe(true)
    expect(result.current.alert).toEqual({
      variant: 'destructive',
      message: 'logs.error_no_auth_token',
    })
    expect(mocks.queryOptions?.enabled).toBe(false)
  })

  it('fetches logs with the current auth token', async () => {
    authStore.getState().update({
      auth: {
        token: 'token',
        refresh_token: 'refresh',
        expiresAt: Date.now() + 1_800_000,
      },
    })
    vi.mocked(fetchLog).mockResolvedValue(new Response('log body'))

    const { result } = renderHook(() => useJmwalletdStdoutLog())

    await expect(mocks.queryOptions?.queryFn?.({ signal: new AbortController().signal })).resolves.toBe('log body')

    await result.current.refresh()

    const fetchLogRequest = vi.mocked(fetchLog).mock.calls[0]?.[0]
    expect(fetchLogRequest).toMatchObject({
      token: 'token',
      fileName: 'jmwalletd_stdout.log',
    })
    expect(fetchLogRequest?.signal).toBeInstanceOf(AbortSignal)
    expect(mocks.queryResult.refetch).toHaveBeenCalled()
  })

  it('converts query errors into warning alerts', () => {
    authStore.getState().update({
      auth: {
        token: 'token',
        refresh_token: 'refresh',
        expiresAt: Date.now() + 1_800_000,
      },
    })
    mocks.queryResult.error = new Error('disk unavailable')

    const { result } = renderHook(() => useJmwalletdStdoutLog())

    expect(result.current.alert).toEqual({
      variant: 'warning',
      message: 'logs.error_loading_logs_failed:disk unavailable',
    })
  })

  it('stays idle when explicitly disabled', async () => {
    authStore.getState().update({
      auth: {
        token: 'token',
        refresh_token: 'refresh',
        expiresAt: Date.now() + 1_800_000,
      },
    })

    const { result } = renderHook(() => useJmwalletdStdoutLog({ enabled: false }))

    expect(result.current.alert).toBeUndefined()
    expect(result.current.isInitialized).toBe(false)
    await result.current.refresh()
    expect(mocks.queryResult.refetch).not.toHaveBeenCalled()
  })
})
