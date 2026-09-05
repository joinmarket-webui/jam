import { displaywalletOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { DisplaywalletResponse, WalletDisplayResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useStore } from 'zustand'
import { isDevMode } from '@/constants/debugFeatures'
import { useApiClient } from '@/hooks/useApiClient'
import { withQueryDelay } from '@/lib/queryClient'
import type { WalletFileName } from '@/lib/utils'
import { jmSessionStore } from '@/store/jmSessionStore'

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
  const jmSession = useStore(jmSessionStore, (state) => state.state?.session)

  const displaywalletQueryOptions = displaywalletOptions({
    client,
    path: { walletname: walletFileName },
  })

  // Extend the generated query key with utxosHashHex so that React Query treats
  // each distinct UTXO state as a distinct query identity. When the UTXO set
  // changes (utxosHashHex changes), React Query automatically fetches the
  // displaywallet endpoint — no manual refetch effect needed.
  const queryKey = [...displaywalletQueryOptions.queryKey, utxosHashHex]

  const queryResult = useQuery({
    ...displaywalletQueryOptions,
    queryKey: queryKey as unknown as typeof displaywalletQueryOptions.queryKey,
    queryFn: withQueryDelay(displaywalletQueryOptions.queryFn, {
      // simulate slow mainnet responses in dev mode
      throttle: isDevMode() ? 2_100 : 0,
    }),
    enabled: !!walletFileName && !!jmSession,
    // When the query key changes (utxosHashHex changes), keep the previous
    // successful data visible while the new request is in-flight.
    // This prevents `isLoading` from temporarily becoming true and causing
    // the wallet balance and jars to be replaced by a spinner.
    placeholderData: keepPreviousData,
  })

  return {
    walletInfo: queryResult.data?.walletinfo,
    queryResult,
  }
}
