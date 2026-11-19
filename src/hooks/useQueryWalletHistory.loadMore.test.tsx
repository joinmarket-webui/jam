import type { PropsWithChildren } from 'react'
import { createClient } from '@joinmarket-webui/joinmarket-api-ts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useQueryWalletHistory } from './useQueryWalletHistory'

const client = createClient({ baseUrl: 'http://localhost/api/v1' })

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => client,
}))

vi.mock('@/context/JamSessionInfoContext', () => ({
  useRawJmSession: () => ({ jmSession: { session: true } }),
}))

vi.mock('@/constants/debugFeatures', () => ({
  isDevMode: () => false,
}))

const historyResponse = (limit: number) =>
  Response.json({
    history: Array.from({ length: limit }, (_, index) => ({
      txid: `txid_${index}`,
      timestamp: '2026-11-01T10:00:00Z',
    })),
  })

describe('useQueryWalletHistory (load more)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the loaded rows while a larger page is fetched', async () => {
    let releaseSecondPage: (() => void) | undefined
    const fetchMock = vi.fn(async (request: Request) => {
      const limit = Number(new URL(request.url).searchParams.get('limit'))
      if (limit > 10) {
        await new Promise<void>((resolve) => (releaseSecondPage = resolve))
      }
      return historyResponse(limit)
    })
    vi.stubGlobal('fetch', fetchMock)

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result, rerender } = renderHook(
      ({ limit }) => useQueryWalletHistory({ walletFileName: 'wallet.jmdat', limit }),
      { wrapper, initialProps: { limit: 10 } },
    )

    await waitFor(() => expect(result.current.history).toHaveLength(10))

    rerender({ limit: 20 })

    await waitFor(() => expect(result.current.queryResult.isFetching).toBe(true))
    expect(result.current.history).toHaveLength(10)
    expect(result.current.queryResult.isLoading).toBe(false)
    expect(result.current.queryResult.isPlaceholderData).toBe(true)

    releaseSecondPage?.()

    await waitFor(() => expect(result.current.history).toHaveLength(20))
    expect(result.current.queryResult.isPlaceholderData).toBe(false)
  })
})
