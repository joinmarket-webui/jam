import type { PropsWithChildren } from 'react'
import { useUtxos } from '@/hooks/useUtxos'
import { walletDisplayName, type WalletFileName } from '@/lib/utils'
import type { AmountSats } from '@/types/global'
import { JamWalletInfoContext, jarTemplates, type Jar } from './JamWalletInfoContext'

interface AccountBalance {
  accountIndex: number
  balance: AmountSats
}

interface JamWalletInfoContextProviderProps {
  walletFileName: WalletFileName
}

export const JamWalletInfoContextProvider = ({
  walletFileName,
  children,
}: PropsWithChildren<JamWalletInfoContextProviderProps>) => {
  const utxos = useUtxos({ walletFileName })

  // Group UTXOs by account and calculate balances
  const accountBalances: AccountBalance[] = []

  // Group UTXOs by mixdepth and sum their values
  utxos?.utxos.forEach((utxo) => {
    if (utxo.mixdepth === undefined || utxo.mixdepth === null) {
      return
    }
    if (utxo.value === undefined || utxo.value === null) {
      return
    }

    // Find existing account or create new one
    const existingAccount = accountBalances.find((acc) => acc.accountIndex === utxo.mixdepth)

    if (existingAccount) {
      existingAccount.balance += utxo.value
    } else {
      accountBalances.push({
        accountIndex: utxo.mixdepth,
        balance: utxo.value,
      })
    }
  })
  // Sort accounts by mixdepth number
  accountBalances.sort((a, b) => a.accountIndex - b.accountIndex)

  // Create the jars array by starting with all jar templates (with zero balance)
  // and then updating the ones that have UTXOs
  const jars: Jar[] = jarTemplates.map((it) => ({
    ...it,
    balance: 0,
  }))

  // Update jars with actual balances from UTXOs
  accountBalances.forEach((it) => {
    // Only process accounts that map to our predefined jars
    if (it.accountIndex < jarTemplates.length) {
      jars[it.accountIndex] = {
        ...jars[it.accountIndex],
        balance: it.balance,
      }
    } else {
      // For accounts beyond our templates, add them at the end
      jars.push({
        accountIndex: it.accountIndex,
        name: `Account ${it.accountIndex}`,
        color: '#808080',
        balance: it.balance,
      })
    }
  })

  const totalBalance = jars.reduce((acc, jar) => acc + (jar.balance || 0), 0)

  const value = {
    jars,
    totalBalance,
    walletName: walletFileName ? walletDisplayName(walletFileName) : null,
    isLoading: utxos.queryResult.isFetching,
    error: utxos.queryResult.error,
    refetchWalletData: utxos.queryResult.refetch,
  }

  return <JamWalletInfoContext.Provider value={value}>{children}</JamWalletInfoContext.Provider>
}
