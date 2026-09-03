import { displaywalletOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { DisplaywalletResponse, WalletDisplayResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { isDevMode } from '@/constants/debugFeatures'
import { useJamSession } from '@/context/JamSessionInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { withQueryDelay } from '@/lib/queryClient'
import type { WalletFileName } from '@/lib/utils'

export type WalletInfoApiObject = NonNullable<WalletDisplayResponse['walletinfo']>

export type UseQueryDisplayWalletResult = {
  walletInfo: WalletInfoApiObject | undefined
  queryResult: UseQueryResult<DisplaywalletResponse, unknown>
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
  const { jmSession } = useJamSession()

  const displaywalletQueryOptions = displaywalletOptions({
    client,
    path: { walletname: walletFileName },
    meta: {
      cacheBuster: utxosHashHex,
    },
  })

  const queryResult = useQuery({
    ...displaywalletQueryOptions,
    queryFn: withQueryDelay(displaywalletQueryOptions.queryFn, {
      // simulate slow mainnet responses in dev mode
      throttle: isDevMode() ? 2_100 : 0,
    }),
    enabled: !!walletFileName && jmSession?.session === true,
  })

  return {
    walletInfo: queryResult.data?.walletinfo,
    queryResult,
  }
}
