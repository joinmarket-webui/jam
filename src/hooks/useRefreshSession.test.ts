import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useQuery } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRefreshSession } from './useRefreshSession'

const mocks = vi.hoisted(() => ({
  jmSession: undefined as SessionResponse | undefined,
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
  sessionOptions: vi.fn(() => ({
    queryKey: ['session'],
    queryFn: vi.fn(),
  })),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}))

vi.mock('@/context/JamSessionInfoContext', () => ({
  useJamSessionInfoContext: () => ({
    jmSession: mocks.jmSession,
  }),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

vi.mock('@/lib/queryClient', () => ({
  withQueryDelay: (queryFn: unknown) => queryFn,
}))

const sessionData = {
  wallet_name: 'wallet.jmdat',
  maker_running: false,
  coinjoin_in_process: false,
} as SessionResponse

describe('useRefreshSession', () => {
  beforeEach(() => {
    mocks.jmSession = undefined
    vi.mocked(useQuery).mockReset()
  })

  it('returns the session state from context', () => {
    mocks.jmSession = sessionData

    const { result } = renderHook(() => useRefreshSession({ enabled: true, refetchInterval: 5_000 }))

    expect(result.current.data).toBe(sessionData)
  })

  it('observes the shared session query with the given interval', () => {
    renderHook(() => useRefreshSession({ enabled: true, refetchInterval: 5_000 }))

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['session'],
        enabled: true,
        refetchInterval: 5_000,
      }),
    )
  })

  it('passes the enabled flag to the query', () => {
    renderHook(() => useRefreshSession({ enabled: false, refetchInterval: 5_000 }))

    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
  })
})
