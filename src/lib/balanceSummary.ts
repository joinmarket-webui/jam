import type { Utxo } from '@/hooks/useQueryUtxos'
import type { AmountSats, Milliseconds } from '@/types/global'
import * as fb from './fidelityBondUtils'

export type BalanceSummary = {
  /**
   * @description Manually calculated total balance in sats.
   */
  calculatedTotalBalanceInSats: AmountSats
  /**
   * @description Manually calculated available balance in sats.
   *   Same as {@link WalletDisplayInfo#available_balance} except address reuse is taken into account.
   */
  calculatedAvailableBalanceInSats: AmountSats
  /**
   * @description Manually calculated confirmed available balance in sats.
   */
  calculatedConfirmedAvailableBalanceInSats: AmountSats
  /**
   * @description Manually calculated frozen or locked balance in sats.
   */
  calculatedFrozenOrLockedBalanceInSats: AmountSats
}

export const BALANCE_SUMMARY_EMPTY: BalanceSummary = {
  calculatedTotalBalanceInSats: 0,
  calculatedAvailableBalanceInSats: 0,
  calculatedConfirmedAvailableBalanceInSats: 0,
  calculatedFrozenOrLockedBalanceInSats: 0,
}

export const toBalanceSummary = (utxos: Utxo[], now?: Milliseconds): BalanceSummary => {
  const refTime = now !== undefined ? now : Date.now()
  return utxos
    .map((utxo) => {
      const isFidelityBond = fb.utxo.isFidelityBond(utxo)
      const frozenOrLocked = utxo.frozen || (isFidelityBond && fb.utxo.isLocked(utxo, refTime))
      const available = !frozenOrLocked
      return {
        total: utxo.value,
        available: available ? utxo.value : 0,
        confirmedAvailable: available && utxo.confirmations > 0 ? utxo.value : 0,
        frozenOrLocked: frozenOrLocked ? utxo.value : 0,
        bond: fb.utxo.isFidelityBond(utxo) ? utxo.value : 0,
      }
    })
    .reduce(
      (acc, info) => ({
        calculatedTotalBalanceInSats: acc.calculatedTotalBalanceInSats + info.total,
        calculatedAvailableBalanceInSats: acc.calculatedAvailableBalanceInSats + info.available,
        calculatedConfirmedAvailableBalanceInSats:
          acc.calculatedConfirmedAvailableBalanceInSats + info.confirmedAvailable,
        calculatedFrozenOrLockedBalanceInSats: acc.calculatedFrozenOrLockedBalanceInSats + info.frozenOrLocked,
      }),
      BALANCE_SUMMARY_EMPTY,
    )
}
