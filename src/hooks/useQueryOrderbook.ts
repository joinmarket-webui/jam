import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { fetchOrderbook, type OrderbookResponse } from '@/lib/api/orderbook'
import { withQueryDelay } from '@/lib/queryClient'

export type UseQueryOrderbookResult = {
  hasOrders: boolean
  queryResult: UseQueryResult<OrderbookResponse, unknown>
}

export function useQueryOrderbook(
  options: Omit<Parameters<typeof useQuery<OrderbookResponse>>[0], 'queryFn' | 'queryKey'> = {},
): UseQueryOrderbookResult {
  const queryResult = useQuery({
    queryKey: ['orderbook-precheck'],
    queryFn: withQueryDelay(fetchOrderbook, {
      // avoid flickering and let user briefly know that something is happening in the background
      delayBefore: 1_000,
    }),
    retry: false,
    staleTime: 30 * 1_000,
    ...options,
  })

  return {
    hasOrders: (queryResult.data?.offers.length ?? 0) > 0,
    queryResult,
  }
}
