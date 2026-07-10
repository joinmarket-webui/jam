import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConfigKey } from '@/constants/jm'
import { jmConfigStore } from '@/store/jmConfigStore'
import { useJmConfig } from './useJmConfig'

const mocks = vi.hoisted(() => ({
  fetchConfig: vi.fn(),
}))

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query', () => ({
  configgetMutation: vi.fn(() => ({})),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(() => ({
    mutateAsync: mocks.fetchConfig,
  })),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

const txFeesKey: ConfigKey = { section: 'POLICY', field: 'tx_fees' }

describe('useJmConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    jmConfigStore.getState().clear()
    mocks.fetchConfig.mockResolvedValue({ configvalue: '3' })
  })

  it('fetches missing config values and stores them', async () => {
    const { result } = renderHook(() => useJmConfig({ walletFileName: 'wallet.jmdat' }))

    // refetch updates the config store, which re-renders the hook wrapper; wrap
    // it in act so that state update is flushed inside act(...)
    await act(async () => {
      await expect(result.current.refetch(txFeesKey)).resolves.toEqual({ key: txFeesKey, value: '3' })
    })

    expect(mocks.fetchConfig).toHaveBeenCalledWith({
      path: { walletname: 'wallet.jmdat' },
      body: {
        section: 'POLICY',
        field: 'tx_fees',
      },
    })
    expect(result.current.get(txFeesKey)).toEqual({ key: txFeesKey, value: '3' })
  })

  it('reuses cached config values before fetching from the API', async () => {
    const { result } = renderHook(() => useJmConfig({ walletFileName: 'wallet.jmdat' }))

    act(() => jmConfigStore.getState().set({ key: txFeesKey, value: '5' }))

    await expect(result.current.fetchIfMissing(txFeesKey)).resolves.toEqual({ key: txFeesKey, value: '5' })
    expect(mocks.fetchConfig).not.toHaveBeenCalled()
  })
})
