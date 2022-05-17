import { useMemo } from 'react'
import { btcToSats } from '../utils'
import { useCurrentWalletInfo, BalanceString, Utxos } from '../context/WalletContext'

interface BalanceSummary {
  totalBalance: string | null
  /**
   * @description available balance (total - frozen - locked); this value is incorrect for backend versions <= 0.9.6
   */
  availableBalanceDontUseYet: string | null
}

type BalanceSummarySupport = BalanceSummary & {
  /**
   * @description available balance (same as {@link BalanceSummary.availableBalanceDontUseYet}) manually calculated
   * @deprecated this value must be used till backend v0.9.7 is released, and then be removed.
   */
  calculatedAvailableBalanceInSats: number | null // in sats
  /**
   * @description frozen or locked balance manually calculated
   * @deprecated this value must be used till backend v0.9.7 is released, and then be removed.
   */
  calculatedFrozenOrLockedBalanceInSats: number | null // in sats
}

type AccountBalanceSummary = BalanceSummarySupport & {
  accountIndex: number
}

type WalletBalanceSummary = BalanceSummarySupport & {
  accountBalances: AccountBalanceSummary[] | null
}

export const parseTotalBalanceString = (rawTotalBalance: BalanceString): BalanceSummary => {
  const indexOfFirstWhitespace = rawTotalBalance.indexOf(' ')

  if (indexOfFirstWhitespace < 0) {
    // backend server version <=v0.9.6 will have an invalid "available balance"
    // as the available balance is not returned in the raw string
    return {
      totalBalance: rawTotalBalance,
      availableBalanceDontUseYet: rawTotalBalance,
    }
  }

  const indexOfOpenBracket = rawTotalBalance.indexOf('(')
  const indexOfCloseBracket = rawTotalBalance.indexOf(')')
  if (indexOfOpenBracket < indexOfFirstWhitespace || indexOfCloseBracket <= indexOfOpenBracket + 1) {
    throw new Error('Unknown format of TotalBalanceString')
  }

  const availableBalance = rawTotalBalance.substring(0, indexOfFirstWhitespace)
  const totalBalance = rawTotalBalance.substring(indexOfOpenBracket + 1, indexOfCloseBracket)

  return {
    totalBalance,
    availableBalanceDontUseYet: availableBalance,
  }
}

/**
 * @deprecated this is necessary for backend version <= v0.9.6;
 */
const calculateFrozenOrLockedBalance = (utxos: Utxos) => {
  const frozenOrLockedUtxos = utxos.filter((utxo) => utxo.frozen || utxo.locktime)
  return frozenOrLockedUtxos.reduce((acc, utxo) => acc + utxo.value, 0)
}

const EMPTY_BALANCE_DETAILS = {
  totalBalance: null,
  availableBalanceDontUseYet: null,
  accountBalances: null,
  calculatedAvailableBalanceInSats: null,
  calculatedFrozenOrLockedBalanceInSats: null,
} as WalletBalanceSummary

const useBalanceSummary = (): WalletBalanceSummary => {
  const currentWalletInfo = useCurrentWalletInfo()

  const balanceSummary = useMemo(() => {
    if (!currentWalletInfo) {
      return EMPTY_BALANCE_DETAILS
    }

    const rawTotalBalance = currentWalletInfo.data.display.walletinfo.total_balance
    const accounts = currentWalletInfo.data.display.walletinfo.accounts
    const utxos = currentWalletInfo.data.utxos.utxos

    try {
      const walletBalanceSummary = parseTotalBalanceString(rawTotalBalance)
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

      const accountsBalanceSummary = accounts.map(({ account, account_balance }) => {
        const accountBalanceSummary = parseTotalBalanceString(account_balance)

        const accountFrozenOrLockedCalculated = frozenOrLockedCalculatedByAccount[account] || 0
        return {
          ...accountBalanceSummary,
          calculatedAvailableBalanceInSats:
            btcToSats(accountBalanceSummary.totalBalance!) - accountFrozenOrLockedCalculated,
          calculatedFrozenOrLockedBalanceInSats: accountFrozenOrLockedCalculated,
          accountIndex: parseInt(account, 10),
        } as AccountBalanceSummary
      })

      const walletFrozenOrLockedCalculated = Object.values(frozenOrLockedCalculatedByAccount).reduce(
        (acc, frozenOrLockedSats) => acc + frozenOrLockedSats,
        0
      )

      return {
        ...walletBalanceSummary,
        accountBalances: accountsBalanceSummary,
        calculatedAvailableBalanceInSats:
          btcToSats(walletBalanceSummary.totalBalance!) - walletFrozenOrLockedCalculated,
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