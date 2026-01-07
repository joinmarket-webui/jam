import { useMemo } from 'react'
import { listutxosOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useQuery } from '@tanstack/react-query'
import { useStore } from 'zustand'
import { useApiClient } from '@/hooks/useApiClient'
import { withQueryDelay } from '@/lib/queryClient'
import { walletDisplayName } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import type { AmountSats } from '@/types/global'

export type JarColor = '#e2b86a' | '#3b5ba9' | '#c94f7c' | '#a67c52' | '#7c3fa6'

export type Jar = {
  name: string
  color: JarColor
  balance: AmountSats
  account: string
}

export const jarTemplates: Array<Pick<Jar, 'name' | 'color'>> = [
  { name: 'Apricot', color: '#e2b86a' },
  { name: 'Blueberry', color: '#3b5ba9' },
  { name: 'Cherry', color: '#c94f7c' },
  { name: 'Date', color: '#a67c52' },
  { name: 'Elderberry', color: '#7c3fa6' },
]

export interface UseWalletDisplayResult {
  jars: Jar[]
  totalBalance: AmountSats
  walletName: string | null
  isLoading: boolean
  error: Error | ErrorMessage | null
  refetchWalletData: () => void
}

interface AccountBalance {
  balance: AmountSats
  account: string
}

export function useWalletDisplay(): UseWalletDisplayResult {
  const client = useApiClient()
  const jmSession = useStore(jmSessionStore, (state) => state.state?.session)
  const walletFileName = useStore(authStore, (state) => state.state?.walletFileName)

  const listutxosQueryOptions = useMemo(
    () =>
      listutxosOptions({
        client,
        path: { walletname: encodeURIComponent(walletFileName || '') },
      }),
    [client, walletFileName],
  )

  const {
    data: utxos,
    isLoading,
    isPending,
    error,
    refetch: refetchWalletData,
  } = useQuery({
    ...listutxosQueryOptions,
    queryFn: withQueryDelay(listutxosQueryOptions.queryFn, {
      delayBefore: 0,
    }),
    enabled: !!walletFileName && !!jmSession,
    refetchInterval: 30_000,
    staleTime: 15_000,
    select: (data) => ({
      utxos: data.utxos || [],
    }),
  })

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

  return {
    jars,
    totalBalance,
    walletName: walletFileName ? walletDisplayName(walletFileName) : null,
    isLoading: isLoading || isPending,
    error,
    refetchWalletData,
  }
}
