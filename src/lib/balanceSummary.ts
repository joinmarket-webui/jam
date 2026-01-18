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
   * @description Manually calculated frozen or locked balance in sats.
   */
  calculatedFrozenOrLockedBalanceInSats: AmountSats
}

const calculateFrozenOrLockedBalance = (utxos: Utxo[], refTime: Milliseconds = Date.now()) => {
  const frozenOrLockedUtxos = utxos.filter((utxo) => utxo.frozen || fb.utxo.isLocked(utxo, refTime))
  return frozenOrLockedUtxos.reduce((acc, utxo) => acc + utxo.value, 0)
}

export const toBalanceSummary = (utxos: Utxo[], now?: Milliseconds): BalanceSummary => {
  const refTime = now !== undefined ? now : Date.now()

  const utxosByAccount = (utxos ?? []).reduce(
    (acc, utxo) => {
      const key = `${utxo.mixdepth}`
      acc[key] = acc[key] || []
      acc[key].push(utxo as Utxo)
      return acc
    },
    {} as { [key: string]: Utxo[] },
  )

  const totalCalculatedByAccount = Object.fromEntries(
    Object.entries(utxosByAccount).map(([account, utxos]) => {
      return [account, utxos.reduce((acc, utxo) => acc + utxo.value, 0)]
    }),
  )
  const frozenOrLockedCalculatedByAccount = Object.fromEntries(
    Object.entries(utxosByAccount).map(([account, utxos]) => {
      return [account, calculateFrozenOrLockedBalance(utxos, refTime)]
    }),
  )

  const walletTotalCalculated: AmountSats = Object.values(totalCalculatedByAccount).reduce(
    (acc, totalSats) => acc + totalSats,
    0,
  )

  const walletFrozenOrLockedCalculated: AmountSats = Object.values(frozenOrLockedCalculatedByAccount).reduce(
    (acc, frozenOrLockedSats) => acc + frozenOrLockedSats,
    0,
  )

  const walletAvailableCalculated = walletTotalCalculated - walletFrozenOrLockedCalculated

  return {
    calculatedTotalBalanceInSats: walletTotalCalculated,
    calculatedFrozenOrLockedBalanceInSats: walletFrozenOrLockedCalculated,
    calculatedAvailableBalanceInSats: walletAvailableCalculated,
  }
}
