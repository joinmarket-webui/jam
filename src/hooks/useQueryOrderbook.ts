import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { fetchOrderbook, type OrderbookResponse } from '@/lib/api/orderbook'

export type UseQueryOrderbookResult = {
  hasOrders: boolean
  queryResult: UseQueryResult<OrderbookResponse, unknown>
}

export function useQueryOrderbook(): UseQueryOrderbookResult {
  const queryResult = useQuery({
    queryKey: ['orderbook-precheck'],
    queryFn: fetchOrderbook,
    retry: false,
  })

  return {
    hasOrders: (queryResult.data?.offers.length ?? 0) > 0,
    queryResult,
  }
}
