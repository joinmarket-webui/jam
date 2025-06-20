import { useQuery } from '@tanstack/react-query'

import { listutxosOptions, sessionOptions } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import { getSession } from '@/lib/session'

import { useApiClient } from '@/hooks/useApiClient'

import { jarTemplates } from '@/components/layout/display-mode-context'
import type { Jar, JarColor } from '@/components/layout/display-mode-context'

export interface UseWalletDisplayResult {
  jars: Jar[]
  totalBalance: number
  walletName: string | null
  isLoading: boolean
  error: Error | null
  refetchWalletData: () => void
}

interface AccountBalance {
  balance: number
  account: string
}

export function useWalletDisplay(): UseWalletDisplayResult {
  const client = useApiClient()

  // Get wallet name from session
  const session = getSession()
  const walletFileName = session?.walletFileName

  // Check if a session is active
  const sessionQuery = useQuery({
    ...sessionOptions({ client }),
    enabled: !!walletFileName,
    staleTime: 60000, // Consider session data fresh for 60 seconds
  })

  // Get wallet UTXOs
  const {
    data: utxosData,
    isLoading,
    error,
    refetch: refetchWalletData,
  } = useQuery({
    ...listutxosOptions({
      client,
      path: { walletname: walletFileName || '' },
    }),
    enabled: !!walletFileName && !!sessionQuery.data?.session,
    refetchInterval: 30000,
    staleTime: 15000,
    select: (data) => ({
      utxos: data.utxos || [],
      walletName: walletFileName,
    }),
  })

  // Group UTXOs by account and calculate balances
  const accountBalances: AccountBalance[] = []

  if (utxosData?.utxos) {
    // Group UTXOs by mixdepth and sum their values
    utxosData.utxos.forEach((utxo) => {
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
  }

  // Sort accounts by mixdepth number
  accountBalances.sort((a, b) => parseInt(a.account) - parseInt(b.account))

  // Create the jars array by starting with all jar templates (with zero balance)
  // and then updating the ones that have UTXOs
  const jars: Jar[] = jarTemplates.map((template, index) => ({
    ...template,
    balance: 0,
    account: index.toString(),
  }))

  // Update jars with actual balances from UTXOs
  accountBalances.forEach((account) => {
    const mixdepthNum = parseInt(account.account)

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

  const totalBalance = jars.reduce((acc, jar) => acc + jar.balance, 0)

  return {
    jars,
    totalBalance,
    walletName: utxosData?.walletName || null,
    isLoading: isLoading || sessionQuery.isLoading,
    error: error || (sessionQuery.error as Error | null),
    refetchWalletData,
  }
}
