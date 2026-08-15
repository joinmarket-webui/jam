import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useQueryOrderbook } from './useQueryOrderbook'

const queryMock = vi.fn<(options: unknown) => unknown>()

vi.mock('@/lib/queryClient', () => ({
  withQueryDelay: (queryFn: unknown) => queryFn,
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown): unknown => queryMock(options),
}))

vi.mock('@/lib/api/orderbook', () => ({
  fetchOrderbook: vi.fn(),
}))

describe('useQueryOrderbook', () => {
  it('returns hasOrders: true when orderbook offers exist', () => {
    const mockOrderbook = {
      offers: [{ counterparty: 'maker1' }],
    }
    queryMock.mockReturnValue({ data: mockOrderbook, isLoading: false, isError: false })

    const { result } = renderHook(() => useQueryOrderbook())

    expect(result.current.hasOrders).toBe(true)
    expect(result.current.queryResult.data).toEqual(mockOrderbook)
  })

  it('returns hasOrders: false when orderbook offers array is empty', () => {
    queryMock.mockReturnValue({ data: { offers: [] }, isLoading: false, isError: false })

    const { result } = renderHook(() => useQueryOrderbook())

    expect(result.current.hasOrders).toBe(false)
  })

  it('returns hasOrders: false when data is undefined', () => {
    queryMock.mockReturnValue({ data: undefined, isLoading: false, isError: false })

    const { result } = renderHook(() => useQueryOrderbook())

    expect(result.current.hasOrders).toBe(false)
  })
})
