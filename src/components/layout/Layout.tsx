import { useTheme } from 'next-themes'
import { CurrencySymbol } from '@/components/CurrencySymbol'
import { Footer } from '@/components/Footer'
import { Navbar } from '@/components/Navbar'
import { useDisplaySettings } from '@/hooks/useDisplaySettings'
import { useWalletDisplay } from '@/hooks/useWalletDisplay'
import { DisplayModeContext } from './display-mode-context'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

  const { currency, isPrivate, toggleCurrencyUnit, togglePrivacyMode, toggleDisplayMode, formatAmount } =
    useDisplaySettings()
  const { jars, totalBalance, walletName, isLoading, error, refetchWalletData } = useWalletDisplay()

  const displayModeValue = {
    currency,
    isPrivate,
    toggleCurrencyUnit,
    togglePrivacyMode,
    toggleDisplayMode,
    formatAmount,
    currencySymbol: (size: 'sm' | 'lg' = 'lg') => (
      <CurrencySymbol currency={currency} isPrivate={isPrivate} size={size} />
    ),
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
          formatAmount={formatAmount}
          currencySymbol={displayModeValue.currencySymbol}
          totalBalance={totalBalance}
          walletName={walletName}
          isLoading={isLoading}
        />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </DisplayModeContext.Provider>
  )
}
