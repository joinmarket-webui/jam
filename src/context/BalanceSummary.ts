import { CombinedRawWalletData, Utxos } from '../context/WalletContext'

import * as fb from '../components/fb/utils'
import { AmountSats } from '../libs/JmWalletApi'

type Milliseconds = number

type BalanceSummary = {
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

type AccountBalanceSummary = BalanceSummary & {
  accountIndex: number
}

type AccountBalances = {
  [key: number]: AccountBalanceSummary
}

export type WalletBalanceSummary = BalanceSummary & {
  accountBalances: AccountBalances
}

const calculateFrozenOrLockedBalance = (utxos: Utxos, refTime: Milliseconds = Date.now()) => {
  const frozenOrLockedUtxos = utxos.filter((utxo) => utxo.frozen || fb.utxo.isLocked(utxo, refTime))
  return frozenOrLockedUtxos.reduce((acc, utxo) => acc + utxo.value, 0)
}

const toBalanceSummary = (rawWalletData: CombinedRawWalletData, now?: Milliseconds): WalletBalanceSummary => {
  const refTime = now !== undefined ? now : Date.now()

  const accounts = rawWalletData.display.walletinfo.accounts
  const utxos = rawWalletData.utxos.utxos

  const utxosByAccount = utxos.reduce((acc, utxo) => {
    const key = `${utxo.mixdepth}`
    acc[key] = acc[key] || []
    acc[key].push(utxo)
    return acc
  }, {} as { [key: string]: Utxos })

  const totalCalculatedByAccount = Object.fromEntries(
    Object.entries(utxosByAccount).map(([account, utxos]) => {
      return [account, utxos.reduce((acc, utxo) => acc + utxo.value, 0)]
    })
  )
  const frozenOrLockedCalculatedByAccount = Object.fromEntries(
    Object.entries(utxosByAccount).map(([account, utxos]) => {
      return [account, calculateFrozenOrLockedBalance(utxos, refTime)]
    })
  )

  const accountsBalanceSummary = accounts
    .map(({ account }) => {
      const accountTotalCalculated: AmountSats = totalCalculatedByAccount[account] || 0
      const accountFrozenOrLockedCalculated: AmountSats = frozenOrLockedCalculatedByAccount[account] || 0
      const accountAvailableCalculated: AmountSats = accountTotalCalculated - accountFrozenOrLockedCalculated
      return {
        calculatedTotalBalanceInSats: accountTotalCalculated,
        calculatedFrozenOrLockedBalanceInSats: accountFrozenOrLockedCalculated,
        calculatedAvailableBalanceInSats: accountAvailableCalculated,
        accountIndex: parseInt(account, 10),
      } as AccountBalanceSummary
    })
    .reduce((acc, curr) => ({ ...acc, [curr.accountIndex]: curr }), {} as AccountBalances)

  const walletTotalCalculated: AmountSats = Object.values(totalCalculatedByAccount).reduce(
    (acc, totalSats) => acc + totalSats,
    0
  )

  const walletFrozenOrLockedCalculated: AmountSats = Object.values(frozenOrLockedCalculatedByAccount).reduce(
    (acc, frozenOrLockedSats) => acc + frozenOrLockedSats,
    0
  )

  const walletAvailableCalculated = walletTotalCalculated - walletFrozenOrLockedCalculated

  return {
    accountBalances: accountsBalanceSummary,
    calculatedTotalBalanceInSats: walletTotalCalculated,
    calculatedFrozenOrLockedBalanceInSats: walletFrozenOrLockedCalculated,
    calculatedAvailableBalanceInSats: walletAvailableCalculated,
  }
}

export { toBalanceSummary, AccountBalances, AccountBalanceSummary }
