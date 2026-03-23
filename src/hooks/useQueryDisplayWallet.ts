import { displaywalletOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { DisplaywalletResponse, ErrorMessage, WalletDisplayResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useStore } from 'zustand'
import { isDevMode } from '@/constants/debugFeatures'
import { useApiClient } from '@/hooks/useApiClient'
import { withQueryDelay } from '@/lib/queryClient'
import type { WalletFileName } from '@/lib/utils'
import { jmSessionStore } from '@/store/jmSessionStore'

export type WalletInfoApiObject = NonNullable<WalletDisplayResponse['walletinfo']>

export type UseQueryDisplayWalletResult = {
  walletInfo: WalletInfoApiObject | undefined
  queryResult: UseQueryResult<DisplaywalletResponse, ErrorMessage>
}

interface UseQueryDisplayWalletProps {
  walletFileName: WalletFileName
  utxosHashHex?: string
}

export function useQueryDisplayWallet({
  walletFileName,
  utxosHashHex = '',
}: UseQueryDisplayWalletProps): UseQueryDisplayWalletResult {
  const client = useApiClient()
  const jmSession = useStore(jmSessionStore, (state) => state.state?.session)

  const displaywalletQueryOptions = displaywalletOptions({
    client,
    path: { walletname: encodeURIComponent(walletFileName || '') },
    query: {
      // cache busting: reload whenever local utxos change
      '#cb': utxosHashHex,
    } as never,
  })

  const queryResult = useQuery({
    ...displaywalletQueryOptions,
    queryFn: withQueryDelay(displaywalletQueryOptions.queryFn, {
      // simulate slow mainnet responses in dev mode
      throttle: isDevMode() ? 2_100 : 0,
    }),
    enabled: !!walletFileName && !!jmSession,
  })

  return {
    walletInfo: queryResult.data?.walletinfo as WalletInfoApiObject,
    queryResult,
  }
}
