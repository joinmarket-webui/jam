import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { WalletFileName } from '@/lib/utils'
import { useQueryWalletHistory } from './useQueryWalletHistory'

const queryMock = vi.fn<(options: unknown) => unknown>()

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => queryMock(options),
}))

vi.mock('@/context/JamSessionInfoContext', () => ({
  useJamSession: () => ({ jmSession: { session: 'mock-session' } }),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

vi.mock('@/constants/debugFeatures', () => ({
  isDevMode: () => false,
}))

vi.mock('@/lib/queryClient', () => ({
  withQueryDelay: (function_: unknown) => function_,
}))

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query', () => ({
  wallethistoryOptions: () => ({ queryKey: ['history'], queryFn: vi.fn() }),
}))

describe('useQueryWalletHistory', () => {
  it('returns history and queryResult when data exists', () => {
    const mockHistory = [{ txid: 'tx1', timestamp: '2026-07-28' }]
    queryMock.mockReturnValue({ data: { history: mockHistory } })

    const { result } = renderHook(() => useQueryWalletHistory({ walletFileName: 'wallet.jmdat' }))

    expect(result.current.history).toEqual(mockHistory)
    expect(result.current.queryResult.data?.history).toEqual(mockHistory)
  })

  it('returns empty array when data does not exist', () => {
    queryMock.mockReturnValue({ data: null })

    const { result } = renderHook(() => useQueryWalletHistory({ walletFileName: 'wallet.jmdat' }))

    expect(result.current.history).toEqual([])
  })

  it('is not enabled if walletFileName is empty', () => {
    queryMock.mockImplementation((options) => options)

    const { result } = renderHook(() =>
      useQueryWalletHistory({ walletFileName: undefined as unknown as WalletFileName }),
    )

    expect((result.current.queryResult as { enabled?: boolean }).enabled).toBe(false)
  })

  it('is not enabled if explicitly disabled', () => {
    queryMock.mockImplementation((options) => options)

    const { result } = renderHook(() => useQueryWalletHistory({ walletFileName: 'wallet.jmdat', enabled: false }))

    expect((result.current.queryResult as { enabled?: boolean }).enabled).toBe(false)
  })
})
