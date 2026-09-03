import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { WalletFileName } from '@/lib/utils'
import { useQueryUtxos } from './useQueryUtxos'

const queryMock = vi.fn<(options: unknown) => unknown>()

vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn(),
  useQuery: (options: unknown) => queryMock(options),
}))

vi.mock('@/context/JamSessionInfoContext', () => ({
  useJamSession: () => ({ jmSession: { session: true } }),
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

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
  listutxosOptions: () => ({ queryKey: ['utxos'], queryFn: vi.fn() }),
}))

describe('useQueryUtxos', () => {
  it('returns utxos and queryResult when data exists', () => {
    const mockUtxos = [{ utxo: 'tx1:0', value: 1000 }]
    queryMock.mockReturnValue({ data: { utxos: mockUtxos } })

    const { result } = renderHook(() => useQueryUtxos({ walletFileName: 'wallet.jmdat' }))

    expect(result.current.utxos).toEqual(mockUtxos)
    expect(result.current.queryResult.data?.utxos).toEqual(mockUtxos)
  })

  it('returns empty array when data does not exist', () => {
    queryMock.mockReturnValue({ data: null })

    const { result } = renderHook(() => useQueryUtxos({ walletFileName: 'wallet.jmdat' }))

    expect(result.current.utxos).toEqual([])
  })

  it('is not enabled if walletFileName is empty', () => {
    queryMock.mockImplementation((options) => options)

    const { result } = renderHook(() => useQueryUtxos({ walletFileName: undefined as unknown as WalletFileName }))

    expect((result.current.queryResult as { enabled?: boolean }).enabled).toBe(false)
  })
})
