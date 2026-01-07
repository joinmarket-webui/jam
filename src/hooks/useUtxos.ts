import { useMemo } from 'react'
import { listutxosOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { ErrorMessage, ListUtxosResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useStore } from 'zustand'
import { useApiClient } from '@/hooks/useApiClient'
import { withQueryDelay } from '@/lib/queryClient'
import type { WalletFileName } from '@/lib/utils'
import { jmSessionStore } from '@/store/jmSessionStore'

interface UseUtxosProps {
  walletFileName: WalletFileName
}

type Utxo = NonNullable<ListUtxosResponse['utxos']>[number]

type UseUtxosResult = {
  utxos: Utxo[]
  queryResult: UseQueryResult<ListUtxosResponse, ErrorMessage>
}

export function useUtxos({ walletFileName }: UseUtxosProps): UseUtxosResult {
  const client = useApiClient()
  const jmSession = useStore(jmSessionStore, (state) => state.state?.session)

  const listutxosQueryOptions = useMemo(
    () =>
      listutxosOptions({
        client,
        path: { walletname: encodeURIComponent(walletFileName || '') },
      }),
    [client, walletFileName],
  )

  const queryResult = useQuery({
    ...listutxosQueryOptions,
    queryFn: withQueryDelay(listutxosQueryOptions.queryFn, {
      delayBefore: 0,
      delayAfter: 210,
    }),
    enabled: !!walletFileName && !!jmSession,
    select: (data) => ({
      utxos: data.utxos || [],
    }),
  })

  return {
    utxos: queryResult.data?.utxos ?? [],
    queryResult,
  }
}
