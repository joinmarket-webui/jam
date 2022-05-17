import { useMemo } from 'react'
import { btcToSats } from '../utils'
import { useCurrentWalletInfo, BalanceString, Utxos } from '../context/WalletContext'

interface BalanceDetails {
  totalBalance: string | null
  /**
   * @description available balance (total - frozen - locked); this value is incorrect for backend versions <= 0.9.6
   */
  availableBalanceDontUseYet: string | null
}

type BalanceDetailsSupport = BalanceDetails & {
  /**
   * @description available balance (same as {@link BalanceDetails.availableBalanceDontUseYet}) manually calculated
   * @deprecated this value must be used till backend v0.9.7 is released, and then be removed.
   */
  calculatedAvailableBalanceInSats: number | null // in sats
  /**
   * @description frozen or locked balance manually calculated
   * @deprecated this value must be used till backend v0.9.7 is released, and then be removed.
   */
  calculatedFrozenOrLockedBalanceInSats: number | null // in sats
}

type AccountBalanceDetails = BalanceDetailsSupport & {
  accountIndex: number
}

type WalletBalanceDetails = BalanceDetailsSupport & {
  accountBalances: AccountBalanceDetails[] | null
}

export const parseTotalBalanceString = (rawTotalBalance: BalanceString): BalanceDetails => {
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
 * @deprecated this is necessary for backend version <= v0.9.6; remove afterwards
 */
const calculateFrozenOrLockedBalance = (accountNumber: number, utxos: Utxos) => {
  const accountUtxos = utxos.filter((it) => it.mixdepth === accountNumber)
  const frozenOrLockedUtxos = accountUtxos.filter((utxo) => utxo.frozen || utxo.locktime)
  return frozenOrLockedUtxos.reduce((acc, utxo) => acc + utxo.value, 0)
}

const EMPTY_BALANCE_DETAILS = {
  totalBalance: null,
  availableBalanceDontUseYet: null,
  accountBalances: null,
  calculatedAvailableBalanceInSats: null,
  calculatedFrozenOrLockedBalanceInSats: null,
} as WalletBalanceDetails

const useBalanceDetails = (): WalletBalanceDetails => {
  const currentWalletInfo = useCurrentWalletInfo()

  const balanceDetails = useMemo(() => {
    if (!currentWalletInfo) {
      return EMPTY_BALANCE_DETAILS
    }

    // raw value is either "<total_and_available_balance>" or "<available_balance> (<total_balance>)"
    const rawTotalBalance = currentWalletInfo.data.display.walletinfo.total_balance
    const accounts = currentWalletInfo.data.display.walletinfo.accounts
    const utxos = currentWalletInfo.data.utxos.utxos

    try {
      const walletBalanceDetails = parseTotalBalanceString(rawTotalBalance)
      const utxosByAccount = utxos.reduce((acc, utxo) => {
        const key = `${utxo.mixdepth}`
        acc[key] = acc[key] || []
        acc[key].push(utxo)
        return acc
      }, {} as { [key: string]: Utxos })

      const calculatedAvailableBalanceByAccount = Object.fromEntries(
        Object.entries(utxosByAccount).map(([account, utxos]) => {
          const accountNumber = parseInt(account, 10)
          return [account, calculateFrozenOrLockedBalance(accountNumber, utxos)]
        })
      )

      const accountsBalanceDetails = accounts.map(({ account, account_balance }) => {
        const accountBalanceDetails = parseTotalBalanceString(account_balance)

        const accountFrozenOrLockedCalculated = calculatedAvailableBalanceByAccount[account] || 0
        return {
          ...accountBalanceDetails,
          calculatedAvailableBalanceInSats:
            btcToSats(accountBalanceDetails.totalBalance!) - accountFrozenOrLockedCalculated,
          calculatedFrozenOrLockedBalanceInSats: accountFrozenOrLockedCalculated,
          accountIndex: parseInt(account, 10),
        } as AccountBalanceDetails
      })

      const walletFrozenOrLockedCalculated = Object.values(calculatedAvailableBalanceByAccount).reduce(
        (acc, frozenOrLockedSats) => acc + frozenOrLockedSats,
        0
      )

      return {
        ...walletBalanceDetails,
        accountBalances: accountsBalanceDetails,
        calculatedAvailableBalanceInSats:
          btcToSats(walletBalanceDetails.totalBalance!) - walletFrozenOrLockedCalculated,
        calculatedFrozenOrLockedBalanceInSats: walletFrozenOrLockedCalculated,
      }
    } catch (e) {
      console.warn('"useBalanceDetails" hook cannot determine balance format', e)
      return EMPTY_BALANCE_DETAILS
    }
  }, [currentWalletInfo])

  return balanceDetails
}

export { useBalanceDetails }
