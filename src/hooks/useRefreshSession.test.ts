import type { SessionResponse } from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authStore } from '@/store/authStore'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { useRefreshSession } from './useRefreshSession'

const mocks = vi.hoisted(() => ({
  queryData: undefined as SessionResponse | undefined,
  refetchSessionData: vi.fn(() => Promise.resolve()),
  toastError: vi.fn(),
}))

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query', () => ({
  sessionOptions: vi.fn(() => ({
    queryKey: ['session'],
    queryFn: vi.fn(),
  })),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: mocks.queryData,
    refetch: mocks.refetchSessionData,
  })),
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
  },
}))

vi.mock('@/context/JamSessionInfoContext', () => ({
  useJamSession: () => ({
    updateSessionInfo: (val: SessionResponse) => jmSessionStore.setState({ state: val }),
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
    mocks.queryData = undefined
    mocks.refetchSessionData.mockReset()
    mocks.refetchSessionData.mockResolvedValue(undefined)
    mocks.toastError.mockReset()
    authStore.getState().clear()
    jamSettingsStore.getState().clear()
    jmSessionStore.setState({ state: undefined })
  })

  it('stores refreshed session data', async () => {
    mocks.queryData = sessionData

    const { result } = renderHook(() => useRefreshSession({ enabled: true, refetchInterval: 5_000 }))

    expect(result.current.data).toBe(sessionData)
    await waitFor(() => expect(jmSessionStore.getState().state).toBe(sessionData))
  })

  it('refetches when the active wallet changes', () => {
    const { rerender } = renderHook(() => useRefreshSession({ enabled: true, refetchInterval: 5_000 }))

    expect(mocks.refetchSessionData).toHaveBeenCalledTimes(1)

    // the store update re-renders the hook, so it must run inside act(...)
    act(() => {
      authStore.getState().update({ walletFileName: 'second-wallet.jmdat' })
    })
    rerender()

    expect(mocks.refetchSessionData).toHaveBeenCalledTimes(2)
  })

  it('shows a developer-mode toast when refetch fails', async () => {
    jamSettingsStore.getState().update({ developerMode: true })
    mocks.refetchSessionData.mockRejectedValue(new Error('network down'))

    renderHook(() => useRefreshSession({ enabled: true, refetchInterval: 5_000 }))

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith('[DEV] Error while refreshing session data.', {
        id: 'jm-session-refresh-error',
      }),
    )
  })
})
