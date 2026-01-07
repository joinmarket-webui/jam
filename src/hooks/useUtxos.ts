import { useMemo } from 'react'
import { listutxosOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { ErrorMessage, ListUtxosResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useStore } from 'zustand'
import { useApiClient } from '@/hooks/useApiClient'
import { withQueryDelay } from '@/lib/queryClient'
import type { WalletFileName } from '@/lib/utils'
import { jmSessionStore } from '@/store/jmSessionStore'
import type { MM, YYYY } from '@/types/global'

interface UseUtxosProps {
  walletFileName: WalletFileName
}
type UtxoApiObject = NonNullable<ListUtxosResponse['utxos']>[number]

type Locktime = `${YYYY}-${MM}-01 00:00:00`

type Vout = number
type TxId = string
export type UtxoId = `${TxId}:${Vout}`

type UtxoBase = Required<UtxoApiObject>
// @apiNote: Although marked as optional, all fields are always present, hence `Required<UtxoApiObject>`
export type Utxo = UtxoBase & {
  utxo: UtxoId // @implNote: more precise type def than plain `string`
  locktime: Locktime | undefined
}

export type FidelityBondUtxo = Omit<Utxo, 'locktime'> & {
  locktime: Locktime
}

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
      utxos: (data.utxos || []) as Utxo[],
    }),
  })

  return {
    utxos: queryResult.data?.utxos ?? [],
    queryResult,
  }
}
