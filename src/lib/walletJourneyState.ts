export type WalletJourneyState =
  | 'loading'
  | 'no-wallet'
  | 'service-offline'
  | 'empty-wallet'
  | 'awaiting-confirmation'
  | 'action-required'
  | 'ready'

export interface WalletJourneyStateInput {
  isWalletLoading: boolean
  isServiceLoading: boolean
  walletName: string | null
  hasServiceError: boolean
  hasWalletError: boolean
  walletTotalBalanceInSats: number
  walletAvailableBalanceInSats: number
  utxoConfirmations: number[]
  minConfirmationsForReady?: number
}

/**
 * Kept in sync with the current coinjoin/sweep precondition expectation.
 * If this threshold changes, update tests and regtest verification docs accordingly.
 */
export const DEFAULT_MIN_CONFIRMATIONS_FOR_READY = 5

export const deriveWalletJourneyState = ({
  isWalletLoading,
  isServiceLoading,
  walletName,
  hasServiceError,
  hasWalletError,
  walletTotalBalanceInSats,
  walletAvailableBalanceInSats,
  utxoConfirmations,
  minConfirmationsForReady = DEFAULT_MIN_CONFIRMATIONS_FOR_READY,
}: WalletJourneyStateInput): WalletJourneyState => {
  // Precedence matters: loading > service availability > wallet bootstrap > actionable states.
  if (isWalletLoading || isServiceLoading) {
    return 'loading'
  }

  if (hasServiceError) {
    return 'service-offline'
  }

  if (!walletName) {
    return 'no-wallet'
  }

  if (hasWalletError) {
    return 'action-required'
  }

  if (walletTotalBalanceInSats <= 0) {
    return 'empty-wallet'
  }

  const hasLowConfirmationUtxos = utxoConfirmations.some((confirmations) => confirmations < minConfirmationsForReady)

  // Wallet has funds, but none are currently actionable.
  if (walletAvailableBalanceInSats <= 0) {
    return hasLowConfirmationUtxos ? 'awaiting-confirmation' : 'action-required'
  }

  return 'ready'
}
