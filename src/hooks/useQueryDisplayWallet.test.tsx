import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WalletFileName } from '@/lib/utils'
import { useQueryDisplayWallet } from './useQueryDisplayWallet'

// ---- Minimal stubs ----------------------------------------------------------------

const capturedQueryKeys: unknown[] = []

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
  displaywalletOptions: ({ path }: { path: { walletname: string } }) => ({
    queryKey: [{ _id: 'displaywallet', path }],
    queryFn: vi.fn(),
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { queryKey: unknown }) => {
    capturedQueryKeys.push(options.queryKey)
    return { data: undefined }
  },
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

vi.mock('@/lib/queryClient', () => ({
  withQueryDelay: (queryFn_: unknown) => queryFn_,
}))

vi.mock('@/constants/debugFeatures', () => ({
  isDevMode: () => false,
}))

vi.mock('@/store/jmSessionStore', () => ({
  jmSessionStore: {
    getState: () => ({ state: { session: 'active' } }),
  },
}))

vi.mock('zustand', () => ({
  useStore: (_store: unknown, selector: (s: { state: { session: string } }) => unknown) =>
    selector({ state: { session: 'active' } }),
}))

// ---- Helpers ----------------------------------------------------------------------

const walletFileName = 'test.jmdat' as WalletFileName

// ---- Tests -----------------------------------------------------------------------

describe('useQueryDisplayWallet — query key participates in React Query identity', () => {
  beforeEach(() => {
    capturedQueryKeys.length = 0
  })

  it('includes utxosHashHex in the query key', () => {
    renderHook(() => useQueryDisplayWallet({ walletFileName, utxosHashHex: 'hash-abc' }))

    expect(capturedQueryKeys).toHaveLength(1)
    const key = capturedQueryKeys[0] as unknown[]
    // The generated key is the first element; utxosHashHex is appended as the last element
    expect(key.at(-1)).toBe('hash-abc')
  })

  it('different utxosHashHex values produce different query keys', () => {
    renderHook(() => useQueryDisplayWallet({ walletFileName, utxosHashHex: 'hash-1' }))
    renderHook(() => useQueryDisplayWallet({ walletFileName, utxosHashHex: 'hash-2' }))

    expect(capturedQueryKeys).toHaveLength(2)
    const key1 = capturedQueryKeys[0] as unknown[]
    const key2 = capturedQueryKeys[1] as unknown[]

    // The keys must differ — React Query will treat them as distinct queries
    expect(key1.at(-1)).toBe('hash-1')
    expect(key2.at(-1)).toBe('hash-2')
    expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key2))
  })

  it('same utxosHashHex produces the same query key', () => {
    renderHook(() => useQueryDisplayWallet({ walletFileName, utxosHashHex: 'stable-hash' }))
    renderHook(() => useQueryDisplayWallet({ walletFileName, utxosHashHex: 'stable-hash' }))

    expect(capturedQueryKeys).toHaveLength(2)
    // Both keys are identical — React Query reuses the cached result
    expect(JSON.stringify(capturedQueryKeys[0])).toBe(JSON.stringify(capturedQueryKeys[1]))
  })

  it('uses empty string as default utxosHashHex when not provided', () => {
    renderHook(() => useQueryDisplayWallet({ walletFileName }))

    expect(capturedQueryKeys).toHaveLength(1)
    const key = capturedQueryKeys[0] as unknown[]
    expect(key.at(-1)).toBe('')
  })

  it('does not put utxosHashHex only in meta — it must be in the array', () => {
    renderHook(() => useQueryDisplayWallet({ walletFileName, utxosHashHex: 'meta-test' }))

    const key = capturedQueryKeys[0] as unknown[]
    // Verify utxosHashHex is a direct element of the key array, not buried in an object
    expect(key).toContain('meta-test')
  })
})
