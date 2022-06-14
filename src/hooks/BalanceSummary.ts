import { useEffect, useMemo, useState } from 'react'
import { WalletInfo, BalanceString, Utxos, Utxo } from '../context/WalletContext'

import { AmountSats } from '../libs/JmWalletApi'

type Milliseconds = number
type Seconds = number

interface BalanceSummary {
  totalBalance: BalanceString
  /**
   * @since clientserver v0.9.7
   * @description available balance (total - frozen - locked)
   *   This value can report less than available in case of address reuse.
   *   See https://github.com/JoinMarket-Org/joinmarket-clientserver/pull/1285#issuecomment-1136438072
   *   Utxos controlled by the same key will not be taken into account if at least one output is
   *   frozen (last checked on 2022-05-24).
   *
   *   Please use {@link BalanceSummarySupport.calculatedAvailableBalanceInSats}) if applicable.
   */
  availableBalance: BalanceString
}

type BalanceSummarySupport = BalanceSummary & {
  /**
   * @description Manually calculated total balance in sats.
   */
  calculatedTotalBalanceInSats: AmountSats
  /**
   * @description Manually calculated available balance in sats.
   *   Same as {@link BalanceSummary.availableBalance} except address reuse is taken into account.
   */
  calculatedAvailableBalanceInSats: AmountSats
  /**
   * @description Manually calculated frozen or locked balance in sats.
   */
  calculatedFrozenOrLockedBalanceInSats: AmountSats
}

type AccountBalanceSummary = BalanceSummarySupport & {
  accountIndex: number
}

type AccountBalances = {
  [key: number]: AccountBalanceSummary
}

export type WalletBalanceSummary = BalanceSummarySupport & {
  accountBalances: AccountBalances
}

export const isLocked = (utxo: Utxo, refTime: Milliseconds = Date.now()) => {
  if (!utxo.locktime) return false

  const pathAndLocktime = utxo.path.split(':')
  if (pathAndLocktime.length !== 2) return false

  const locktimeUnixTimestamp: Seconds = parseInt(pathAndLocktime[1], 10)
  if (Number.isNaN(locktimeUnixTimestamp)) return false

  return locktimeUnixTimestamp * 1_000 >= refTime
}

const calculateFrozenOrLockedBalance = (utxos: Utxos, refTime: Milliseconds = Date.now()) => {
  const frozenOrLockedUtxos = utxos.filter((utxo) => utxo.frozen || isLocked(utxo, refTime))
  return frozenOrLockedUtxos.reduce((acc, utxo) => acc + utxo.value, 0)
}

const useBalanceSummary = (currentWalletInfo: WalletInfo | null, now?: Milliseconds): WalletBalanceSummary | null => {
  const [refTime, setRefTime] = useState<Milliseconds>(now !== undefined ? now : Date.now())

  useEffect(() => {
    if (!currentWalletInfo) return
    setRefTime(now !== undefined ? now : Date.now())
  }, [now, currentWalletInfo])

  const balanceSummary = useMemo(() => {
    if (!currentWalletInfo) {
      return null
    }

    const accounts = currentWalletInfo.data.display.walletinfo.accounts
    const utxos = currentWalletInfo.data.utxos.utxos

    try {
      const walletBalanceSummary: BalanceSummary = {
        totalBalance: currentWalletInfo.data.display.walletinfo.total_balance,
        availableBalance: currentWalletInfo.data.display.walletinfo.available_balance,
      }
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
        .map(({ account, account_balance, available_balance }) => {
          const accountBalanceSummary: BalanceSummary = {
            totalBalance: account_balance,
            availableBalance: available_balance,
          }
          const accountTotalCalculated: AmountSats = totalCalculatedByAccount[account] || 0
          const accountFrozenOrLockedCalculated: AmountSats = frozenOrLockedCalculatedByAccount[account] || 0
          const accountAvailableCalculated: AmountSats = accountTotalCalculated - accountFrozenOrLockedCalculated
          return {
            ...accountBalanceSummary,
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
        ...walletBalanceSummary,
        accountBalances: accountsBalanceSummary,
        calculatedTotalBalanceInSats: walletTotalCalculated,
        calculatedFrozenOrLockedBalanceInSats: walletFrozenOrLockedCalculated,
        calculatedAvailableBalanceInSats: walletAvailableCalculated,
      }
    } catch (e) {
      console.warn('"useBalanceSummary" hook cannot determine balance format', e)
      return null
    }
  }, [currentWalletInfo, refTime])

  return balanceSummary
}

export { useBalanceSummary }
