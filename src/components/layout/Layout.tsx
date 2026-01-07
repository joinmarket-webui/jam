import { useTheme } from 'next-themes'
import { Footer } from '@/components/Footer'
import { Navbar } from '@/components/Navbar'
import { useJamDisplayContext } from '../../context/JamDisplayContext'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

  const { totalBalance, walletName, isLoading, formatAmount, currencySymbol } = useJamDisplayContext()

  return (
    <div className="light:bg-white light:text-black flex min-h-screen flex-col bg-[#181b20] text-white transition-colors duration-300">
      <Navbar
        theme={resolvedTheme || 'dark'}
        toggleTheme={toggleTheme}
        formatAmount={formatAmount}
        currencySymbol={currencySymbol}
        totalBalance={totalBalance}
        walletName={walletName}
        isLoading={isLoading}
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
