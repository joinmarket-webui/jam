import { useMemo } from 'react'
import { btcToSats } from '../utils'
import { WalletInfo, BalanceString, Utxos } from '../context/WalletContext'

interface BalanceSummary {
  totalBalance: BalanceString | null
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
  availableBalance: BalanceString | null
}

type BalanceSummarySupport = BalanceSummary & {
  /**
   * @description Manually calculated available balance in sats.
   *   Same as {@link BalanceSummary.availableBalance} except address reuse is taken into account.
   */
  calculatedAvailableBalanceInSats: number | null
  /**
   * @description Manually calculated frozen or locked balance in sats.
   */
  calculatedFrozenOrLockedBalanceInSats: number | null
}

type AccountBalanceSummary = BalanceSummarySupport & {
  accountIndex: number
}

export type WalletBalanceSummary = BalanceSummarySupport & {
  accountBalances: AccountBalanceSummary[] | null
}

const calculateFrozenOrLockedBalance = (utxos: Utxos) => {
  const frozenOrLockedUtxos = utxos.filter((utxo) => utxo.frozen || utxo.locktime)
  return frozenOrLockedUtxos.reduce((acc, utxo) => acc + utxo.value, 0)
}

const EMPTY_BALANCE_DETAILS = {
  totalBalance: null,
  availableBalance: null,
  accountBalances: null,
  calculatedAvailableBalanceInSats: null,
  calculatedFrozenOrLockedBalanceInSats: null,
} as WalletBalanceSummary

const useBalanceSummary = (currentWalletInfo: WalletInfo | null): WalletBalanceSummary => {
  const balanceSummary = useMemo(() => {
    if (!currentWalletInfo) {
      return EMPTY_BALANCE_DETAILS
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

      const frozenOrLockedCalculatedByAccount = Object.fromEntries(
        Object.entries(utxosByAccount).map(([account, utxos]) => {
          return [account, calculateFrozenOrLockedBalance(utxos)]
        })
      )

      const accountsBalanceSummary = accounts.map(({ account, account_balance, available_balance }) => {
        const accountBalanceSummary: BalanceSummary = {
          totalBalance: account_balance,
          availableBalance: available_balance,
        }

        const accountFrozenOrLockedCalculated = frozenOrLockedCalculatedByAccount[account] || 0
        const accountAvailableCalculatedInSats =
          btcToSats(accountBalanceSummary.totalBalance!) - accountFrozenOrLockedCalculated
        return {
          ...accountBalanceSummary,
          calculatedAvailableBalanceInSats: accountAvailableCalculatedInSats,
          calculatedFrozenOrLockedBalanceInSats: accountFrozenOrLockedCalculated,
          accountIndex: parseInt(account, 10),
        } as AccountBalanceSummary
      })

      const walletFrozenOrLockedCalculated = Object.values(frozenOrLockedCalculatedByAccount).reduce(
        (acc, frozenOrLockedSats) => acc + frozenOrLockedSats,
        0
      )

      const walletAvailableCalculatedInSats =
        btcToSats(walletBalanceSummary.totalBalance!) - walletFrozenOrLockedCalculated

      return {
        ...walletBalanceSummary,
        accountBalances: accountsBalanceSummary,
        calculatedAvailableBalanceInSats: walletAvailableCalculatedInSats,
        calculatedFrozenOrLockedBalanceInSats: walletFrozenOrLockedCalculated,
      }
    } catch (e) {
      console.warn('"useBalanceSummary" hook cannot determine balance format', e)
      return EMPTY_BALANCE_DETAILS
    }
  }, [currentWalletInfo])

  return balanceSummary
}

export { useBalanceSummary }
