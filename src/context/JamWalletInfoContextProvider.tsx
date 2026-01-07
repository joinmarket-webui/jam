import type { PropsWithChildren } from 'react'
import { useUtxos } from '@/hooks/useUtxos'
import { walletDisplayName, type WalletFileName } from '@/lib/utils'
import type { AmountSats } from '@/types/global'
import { JamWalletInfoContext, jarTemplates, type Jar, type JarColor } from './JamWalletInfoContext'

interface AccountBalance {
  balance: AmountSats
  account: string
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
    const mixdepth = utxo.mixdepth?.toString() || '0'

    // Find existing account or create new one
    const existingAccount = accountBalances.find((acc) => acc.account === mixdepth)

    if (existingAccount) {
      existingAccount.balance += utxo.value || 0
    } else {
      accountBalances.push({
        account: mixdepth,
        balance: utxo.value || 0,
      })
    }
  })
  // Sort accounts by mixdepth number
  accountBalances.sort((a, b) => parseInt(a.account, 10) - parseInt(b.account, 10))

  // Create the jars array by starting with all jar templates (with zero balance)
  // and then updating the ones that have UTXOs
  const jars: Jar[] = jarTemplates.map((template, index) => ({
    ...template,
    balance: 0,
    account: index.toString(),
  }))

  // Update jars with actual balances from UTXOs
  accountBalances.forEach((account) => {
    const mixdepthNum = parseInt(account.account, 10)

    // Only process accounts that map to our predefined jars
    if (mixdepthNum < jarTemplates.length) {
      jars[mixdepthNum] = {
        ...jars[mixdepthNum],
        balance: account.balance,
        account: account.account,
      }
    } else {
      // For accounts beyond our templates, add them at the end
      jars.push({
        name: `Account ${account.account}`,
        color: '#808080' as JarColor, // Default color
        balance: account.balance,
        account: account.account,
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
