import { CancelledError } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConfigKey } from '@/constants/jm'
import { jmConfigStore } from '@/store/jmConfigStore'
import { useJmConfig } from './useJmConfig'

const mocks = vi.hoisted(() => ({
  fetchConfig: vi.fn(),
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
  configgetMutation: vi.fn(() => ({})),
}))

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useMutation: vi.fn(() => ({
    mutateAsync: mocks.fetchConfig,
  })),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

const txFeesKey: ConfigKey = { section: 'POLICY', field: 'tx_fees' }

const deferredConfigResponse = () => {
  let resolve!: (value: { configvalue: string }) => void
  const promise = new Promise<{ configvalue: string }>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

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
  it.each([undefined, '8'])('discards pre-reset responses with replacement %s', async (replacement) => {
    const pendingResponse = deferredConfigResponse()
    mocks.fetchConfig.mockReturnValueOnce(pendingResponse.promise)
    const { result } = renderHook(() => useJmConfig({ walletFileName: 'old.jmdat' }))
    const pending = result.current.refetch(txFeesKey)
    act(() => {
      jmConfigStore.getState().clear()
      if (replacement !== undefined) jmConfigStore.getState().set({ key: txFeesKey, value: replacement })
    })
    await act(async () => {
      const rejected = expect(pending).rejects.toBeInstanceOf(CancelledError)
      pendingResponse.resolve({ configvalue: '2' })
      await rejected
    })
    expect(jmConfigStore.getState().get(txFeesKey)).toEqual(
      replacement === undefined ? null : { key: txFeesKey, value: replacement },
    )
  })

  it('preserves a newer same-key cache write without a reset', async () => {
    const key: ConfigKey = { section: 'POLICY', field: 'minimum_makers' }
    const response = deferredConfigResponse()
    mocks.fetchConfig.mockReturnValueOnce(response.promise)
    const { result } = renderHook(() => useJmConfig({ walletFileName: 'wallet.jmdat' }))
    const pending = result.current.refetch(key)
    act(() => jmConfigStore.getState().set({ key, value: '8' }))
    await act(async () => {
      const rejected = expect(pending).rejects.toBeInstanceOf(CancelledError)
      response.resolve({ configvalue: '2' })
      await rejected
    })
    expect(jmConfigStore.getState().get(key)?.value).toBe('8')
  })

  it('allows concurrent different-key reads in the same cache generation', async () => {
    const first = deferredConfigResponse()
    const second = deferredConfigResponse()
    mocks.fetchConfig.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const otherKey: ConfigKey = { section: 'POLICY', field: 'minimum_makers' }
    const { result } = renderHook(() => useJmConfig({ walletFileName: 'wallet.jmdat' }))
    const a = result.current.refetch(txFeesKey)
    const b = result.current.refetch(otherKey)
    await act(async () => {
      second.resolve({ configvalue: '8' })
      await b
      first.resolve({ configvalue: '3' })
      await a
    })
    expect(jmConfigStore.getState().get(txFeesKey)?.value).toBe('3')
    expect(jmConfigStore.getState().get(otherKey)?.value).toBe('8')
  })
})
