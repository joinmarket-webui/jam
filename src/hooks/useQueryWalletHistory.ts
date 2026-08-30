import { useEffect } from 'react'
import { wallethistoryOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { HistoryEntry, WalletHistoryResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { isDevMode } from '@/constants/debugFeatures'
import { useJamSession } from '@/context/JamSessionInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { withQueryDelay } from '@/lib/queryClient'
import type { WalletFileName } from '@/lib/utils'

export type { HistoryEntry } from '@joinmarket-webui/joinmarket-api-ts/jm'

export type UseQueryWalletHistoryResult = {
  history: HistoryEntry[]
  queryResult: UseQueryResult<WalletHistoryResponse, unknown>
}

interface UseQueryWalletHistoryProps {
  walletFileName: WalletFileName
  limit?: number
  enabled?: boolean
  utxosHashHex?: string
}

const EMPTY_HISTORY: HistoryEntry[] = []

export function useQueryWalletHistory({
  walletFileName,
  limit,
  enabled = true,
  utxosHashHex = '',
}: UseQueryWalletHistoryProps): UseQueryWalletHistoryResult {
  const client = useApiClient()
  const { jmSession } = useJamSession()

  const queryOptions = wallethistoryOptions({
    client,
    path: { walletname: walletFileName || '' },
    query: { limit },
    meta: {
      cacheBuster: utxosHashHex,
    },
  })

  const queryResult = useQuery({
    ...queryOptions,
    queryFn: withQueryDelay(queryOptions.queryFn, {
      // simulate slow mainnet responses in dev mode
      throttle: isDevMode() ? 210 : 0,
    }),
    enabled: enabled && !!walletFileName && !!jmSession?.session,
  })

  const { refetch } = queryResult

  useEffect(() => {
    if (utxosHashHex && enabled) {
      void refetch()
    }
  }, [utxosHashHex, enabled, refetch])

  return {
    history: queryResult.data?.history ?? EMPTY_HISTORY,
    queryResult,
  }
}
