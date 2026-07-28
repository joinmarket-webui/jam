import { wallethistoryOptions } from '@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query'
import type { HistoryEntry, WalletHistoryResponse } from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useStore } from 'zustand'
import { isDevMode } from '@/constants/debugFeatures'
import { useApiClient } from '@/hooks/useApiClient'
import { withQueryDelay } from '@/lib/queryClient'
import type { WalletFileName } from '@/lib/utils'
import { jmSessionStore } from '@/store/jmSessionStore'

export type { HistoryEntry } from '@joinmarket-webui/joinmarket-ng-api-ts/jm'

export type UseQueryWalletHistoryResult = {
  history: HistoryEntry[]
  queryResult: UseQueryResult<WalletHistoryResponse, unknown>
}

interface UseQueryWalletHistoryProps {
  walletFileName: WalletFileName
  limit?: number
  enabled?: boolean
}

const EMPTY_HISTORY: HistoryEntry[] = []

export function useQueryWalletHistory({
  walletFileName,
  limit,
  enabled = true,
}: UseQueryWalletHistoryProps): UseQueryWalletHistoryResult {
  const client = useApiClient()
  const jmSession = useStore(jmSessionStore, (state) => state.state?.session)

  const queryOptions = wallethistoryOptions({
    client,
    path: { walletname: walletFileName || '' },
    query: { limit },
  })

  const queryResult = useQuery({
    ...queryOptions,
    queryFn: withQueryDelay(queryOptions.queryFn, {
      // simulate slow mainnet responses in dev mode
      throttle: isDevMode() ? 210 : 0,
    }),
    enabled: enabled && !!walletFileName && !!jmSession,
  })

  return {
    history: queryResult.data?.history ?? EMPTY_HISTORY,
    queryResult,
  }
}
