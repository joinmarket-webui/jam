import { createElement, type PropsWithChildren } from 'react'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRefreshSession } from './useRefreshSession'

const mocks = vi.hoisted(() => ({
  jmSession: undefined as SessionResponse | undefined,
  refetchSessionData: vi.fn(() => Promise.reject(new Error('boom'))),
}))

vi.mock('@/context/JamSessionInfoContext', () => ({
  useJamSessionInfoContext: () => ({
    jmSession: mocks.jmSession,
    refetchSessionData: mocks.refetchSessionData,
  }),
}))

const sessionData = {
  wallet_name: 'wallet.jmdat',
  maker_running: false,
  coinjoin_in_process: false,
} as SessionResponse

function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return function QueryWrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client: queryClient, children })
  }
}

describe('useRefreshSession', () => {
  beforeEach(() => {
    mocks.jmSession = undefined
    mocks.refetchSessionData.mockReset()
    mocks.refetchSessionData.mockResolvedValue(undefined as never)
  })

  it('returns the session state from context and refreshes it through the query', async () => {
    mocks.jmSession = sessionData

    const { result } = renderHook(() => useRefreshSession({ enabled: true, refetchInterval: 5_000, refetchDelay: 0 }), {
      wrapper: createQueryWrapper(),
    })

    expect(result.current.data).toBe(sessionData)
    await waitFor(() => expect(mocks.refetchSessionData).toHaveBeenCalledTimes(1))
  })

  it('returns updated context session state after a rerender', () => {
    const { result, rerender } = renderHook(() => useRefreshSession({ enabled: false, refetchInterval: 5_000 }), {
      wrapper: createQueryWrapper(),
    })

    expect(result.current.data).toBeUndefined()

    act(() => {
      mocks.jmSession = sessionData
    })
    rerender()

    expect(result.current.data).toBe(sessionData)
    expect(mocks.refetchSessionData).not.toHaveBeenCalled()
  })

  it('does not refetch when disabled', () => {
    renderHook(() => useRefreshSession({ enabled: false, refetchInterval: 5_000 }), {
      wrapper: createQueryWrapper(),
    })

    expect(mocks.refetchSessionData).not.toHaveBeenCalled()
  })
})
