import { displaywalletOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { DisplaywalletResponse, ErrorMessage, WalletDisplayResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useStore } from 'zustand'
import { isDevMode } from '@/constants/debugFeatures'
import { useApiClient } from '@/hooks/useApiClient'
import { withQueryDelay } from '@/lib/queryClient'
import type { WalletFileName } from '@/lib/utils'
import { jmSessionStore } from '@/store/jmSessionStore'
import type { Milliseconds } from '@/types/global'

// simulate slow mainnet responses in dev mode
const QUERY_DELAY_AFTER: Milliseconds = isDevMode() ? 2_100 : 0

type WalletInfoApiObject = NonNullable<WalletDisplayResponse['walletinfo']>

export type UseQueryDisplayWalletResult = {
  walletInfo: WalletInfoApiObject | undefined
  queryResult: UseQueryResult<DisplaywalletResponse, ErrorMessage>
}

interface UseUtxosProps {
  walletFileName: WalletFileName
}

export function useQueryDisplayWallet({ walletFileName }: UseUtxosProps): UseQueryDisplayWalletResult {
  const client = useApiClient()
  const jmSession = useStore(jmSessionStore, (state) => state.state?.session)

  const displaywalletQueryOptions = displaywalletOptions({
    client,
    path: { walletname: encodeURIComponent(walletFileName || '') },
  })

  const queryResult = useQuery({
    ...displaywalletQueryOptions,
    queryFn: withQueryDelay(displaywalletQueryOptions.queryFn, {
      delayBefore: 0,
      delayAfter: QUERY_DELAY_AFTER,
    }),
    enabled: !!walletFileName && !!jmSession,
  })

  return {
    walletInfo: queryResult.data?.walletinfo as WalletInfoApiObject,
    queryResult,
  }
}
