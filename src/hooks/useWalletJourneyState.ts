import { useMemo } from 'react'
import { useStore } from 'zustand'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import { jmSessionStore } from '@/store/jmSessionStore'

export type WalletJourneyState =
  | 'no_wallet_or_not_initialized'
  | 'coinjoin_in_progress'
  | 'empty_wallet'
  | 'ready_for_coinjoin'
  | 'funded_not_ready'

type ServiceInfoContextValue = {
  serviceAvailable: boolean
  makerRunning: boolean
  coinjoinInProgress: boolean
}

const useServiceInfoContext = (): ServiceInfoContextValue => {
  const jmSession = useStore(jmSessionStore, (state) => state.state)

  return useMemo(
    () => ({
      serviceAvailable: jmSession !== undefined,
      makerRunning: jmSession?.maker_running === true,
      coinjoinInProgress: jmSession?.coinjoin_in_process === true || (jmSession?.schedule?.length || 0) > 0,
    }),
    [jmSession],
  )
}

export function useWalletJourneyState(): WalletJourneyState {
  const wallet = useJamWalletInfoContext()
  const serviceInfo = useServiceInfoContext()

  return useMemo(() => {
    const walletReady = wallet.isLoading === false && wallet.error === null
    const hasWallet = wallet.walletName !== null

    const totalBalanceSats = wallet.walletBalanceSummary.calculatedTotalBalanceInSats
    const availableBalanceSats = wallet.walletBalanceSummary.calculatedAvailableBalanceInSats

    if (!hasWallet || !walletReady || !serviceInfo.serviceAvailable) {
      return 'no_wallet_or_not_initialized'
    }

    if (serviceInfo.coinjoinInProgress) {
      return 'coinjoin_in_progress'
    }

    if (totalBalanceSats <= 0) {
      return 'empty_wallet'
    }

    if (!serviceInfo.makerRunning && availableBalanceSats > 0) {
      return 'ready_for_coinjoin'
    }

    return 'funded_not_ready'
  }, [
    serviceInfo.coinjoinInProgress,
    serviceInfo.makerRunning,
    serviceInfo.serviceAvailable,
    wallet.error,
    wallet.isLoading,
    wallet.walletBalanceSummary.calculatedAvailableBalanceInSats,
    wallet.walletBalanceSummary.calculatedTotalBalanceInSats,
    wallet.walletName,
  ])
}
