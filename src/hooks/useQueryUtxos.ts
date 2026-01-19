import { listutxosOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { ErrorMessage, ListUtxosResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useStore } from 'zustand'
import { useApiClient } from '@/hooks/useApiClient'
import { withQueryDelay } from '@/lib/queryClient'
import type { WalletFileName } from '@/lib/utils'
import { jmSessionStore } from '@/store/jmSessionStore'
import type { MM, YYYY } from '@/types/global'

type UtxoApiObject = NonNullable<ListUtxosResponse['utxos']>[number]

type Lockdate = `${YYYY}-${MM}-01`
type Locktime = `${Lockdate} 00:00:00`

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

export type UseQueryUtxosResult = {
  utxos: Utxo[]
  queryResult: UseQueryResult<ListUtxosResponse, ErrorMessage>
}

interface UseQueryUtxosProps {
  walletFileName: WalletFileName
}

const EMPTY_UTXOS: Utxo[] = []

export function useQueryUtxos({ walletFileName }: UseQueryUtxosProps): UseQueryUtxosResult {
  const client = useApiClient()
  const jmSession = useStore(jmSessionStore, (state) => state.state?.session)

  const listutxosQueryOptions = listutxosOptions({
    client,
    path: { walletname: encodeURIComponent(walletFileName || '') },
  })

  const queryResult = useQuery({
    ...listutxosQueryOptions,
    queryFn: withQueryDelay(listutxosQueryOptions.queryFn, {
      delayBefore: 0,
      delayAfter: 0,
    }),
    enabled: !!walletFileName && !!jmSession,
  })

  return {
    utxos: (queryResult.data?.utxos as Utxo[]) ?? EMPTY_UTXOS,
    queryResult,
  }
}
