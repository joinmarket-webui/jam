import { Navbar } from '../Navbar'
import { Footer } from '../Footer'
import { DisplayModeContext } from './display-mode-context'
import { useTheme } from 'next-themes'
import { useDisplayMode } from '@/hooks/useDisplayMode'
import { useWalletDisplay } from '@/hooks/useWalletDisplay'
import { DisplayLogo } from '../DisplayLogo'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const { displayMode, toggleDisplayMode, formatAmount } = useDisplayMode()
  const { jars, totalBalance, walletName, isLoading, error, refetchWalletData } = useWalletDisplay()

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

  // Prepare the context value
  const displayModeValue = {
    displayMode,
    toggleDisplayMode,
    formatAmount,
    getLogo: (size: 'sm' | 'lg' = 'lg') => <DisplayLogo displayMode={displayMode} size={size} />,
    jars,
    totalBalance,
    walletName,
    isLoading,
    error,
    refetchWalletData,
  }

  return (
    <DisplayModeContext.Provider value={displayModeValue}>
      <div className="flex min-h-screen flex-col bg-white text-black transition-colors duration-300 dark:bg-[#181b20] dark:text-white">
        <Navbar
          theme={resolvedTheme || 'dark'}
          toggleTheme={toggleTheme}
          toggleDisplayMode={toggleDisplayMode}
          formatAmount={formatAmount}
          getLogo={(size) => <DisplayLogo displayMode={displayMode} size={size} />}
          jars={jars}
          isLoading={isLoading}
        />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </DisplayModeContext.Provider>
  )
}
