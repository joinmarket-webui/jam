import { useEffect, useState } from 'react'
import { Navbar } from '../Navbar'
import { Footer } from '../Footer'
import { useQuery } from '@tanstack/react-query'
import { getSession } from '@/lib/session'
import { DisplayModeContext, jarTemplates } from './display-mode-context'
import type { Jar, JarColor } from './display-mode-context'
import { displaywallet, session as apiSession } from '@/lib/jm-api/generated/client'
import { useApiClient } from '@/hooks/useApiClient'
import { useTheme } from 'next-themes'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const client = useApiClient()
  const { resolvedTheme, setTheme } = useTheme()

  const [displayMode, setDisplayMode] = useState<'sats' | 'btc'>('sats')

  useEffect(() => {
    if (resolvedTheme === 'light') {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    }
  }, [resolvedTheme])

  // Get wallet name from session
  const session = getSession()
  const walletFileName = session?.walletFileName

  const {
    data: walletData,
    isLoading,
    error,
    refetch: refetchWalletData,
  } = useQuery({
    queryKey: ['walletDisplay', walletFileName],
    queryFn: async () => {
      if (!walletFileName) {
        throw new Error('No wallet file name in session')
      }

      // First ensure we have a session
      const { data: sessionInfo } = await apiSession({ client })
      if (!sessionInfo?.session) {
        throw new Error('No active session')
      }

      // Then get wallet display data
      const { data: walletInfo, error } = await displaywallet({
        client,
        path: { walletname: walletFileName },
      })

      if (error) {
        throw error
      }

      return walletInfo
    },
    enabled: !!walletFileName,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data fresh for 15 seconds
  })

  // Create the jars array by combining jar templates with actual account data
  interface WalletAccount {
    account?: string
    account_balance?: string
    available_balance?: string
  }

  const jars: Jar[] = walletData
    ? walletData.walletinfo.accounts.map((account: WalletAccount, index: number) => {
        // Parse balance as a float from BTC value, then convert to sats (multiply by 100,000,000)
        const btcBalance: number = parseFloat(account.available_balance || '0') || 0
        const satsBalance: number = Math.round(btcBalance * 100_000_000)

        // Only use up to 5 accounts, matching with jar templates
        if (index >= jarTemplates.length) {
          return {
            name: `Account ${account.account}`,
            color: '#808080' as JarColor, // Default color
            balance: satsBalance,
            account: account.account,
          }
        }

        return {
          ...jarTemplates[index],
          balance: satsBalance,
          account: account.account,
        }
      })
    : jarTemplates.map((jar) => ({ ...jar, balance: 0 }))

  const totalBalance = jars.reduce((acc, jar) => acc + jar.balance, 0)

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  const toggleDisplayMode = () => setDisplayMode((m) => (m === 'sats' ? 'btc' : 'sats'))

  function formatAmount(amount: number) {
    if (displayMode === 'btc') {
      return (amount / 100_000_000).toLocaleString(undefined, {
        maximumFractionDigits: 8,
      })
    }
    return amount.toLocaleString()
  }

  function getLogo(size: 'sm' | 'lg' = 'lg') {
    if (displayMode === 'btc') {
      return <span className={size === 'sm' ? 'text-lg ml-1' : 'text-4xl ml-1'}>₿</span>
    }
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size === 'sm' ? '18px' : '40px'}
        height={size === 'sm' ? '18px' : '40px'}
        viewBox="0 0 24 24"
        fill="none"
        style={{
          display: 'inline',
          verticalAlign: 'middle',
          marginLeft: 4,
        }}
      >
        <path d="M7 7.90906H17" stroke="currentColor" />
        <path d="M12 5.45454V3" stroke="currentColor" />
        <path d="M12 20.9999V18.5454" stroke="currentColor" />
        <path d="M7 12H17" stroke="currentColor" />
        <path d="M7 16.0909H17" stroke="currentColor" />
      </svg>
    )
  }

  const displayModeValue = {
    displayMode,
    toggleDisplayMode,
    formatAmount,
    getLogo,
    jars,
    totalBalance,
    walletName: walletData?.walletinfo?.wallet_name || null,
    isLoading,
    error: error as Error | null,
    refetchWalletData,
  }

  return (
    <DisplayModeContext.Provider value={displayModeValue}>
      <div className="min-h-screen flex flex-col bg-white text-black dark:bg-[#181b20] dark:text-white transition-colors duration-300">
        <Navbar
          theme={resolvedTheme || 'dark'}
          toggleTheme={toggleTheme}
          toggleDisplayMode={toggleDisplayMode}
          formatAmount={formatAmount}
          getLogo={getLogo}
          jars={jars}
          isLoading={isLoading}
        />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </DisplayModeContext.Provider>
  )
}
