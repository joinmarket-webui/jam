import { useTheme } from 'next-themes'
import { Footer } from '@/components/Footer'
import { Navbar } from '@/components/Navbar'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import { useJamDisplayContext } from '../../context/JamDisplayContext'
import { Sidebar, SidebarProvider, SidebarTrigger } from '../ui/sidebar'
import { AppSidebar } from './AppSidebar'

const SIDEBAR_SIDE: React.ComponentProps<typeof Sidebar>['side'] = 'right'
interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

  const { formatAmount, currencySymbol } = useJamDisplayContext()
  const { totalBalance, walletName, isLoading } = useJamWalletInfoContext()

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="light:bg-white light:text-black flex min-h-screen flex-1 flex-col bg-[#181b20] text-white transition-colors duration-300">
        <Navbar
          theme={resolvedTheme || 'dark'}
          toggleTheme={toggleTheme}
          formatAmount={formatAmount}
          currencySymbol={currencySymbol}
          totalBalance={totalBalance}
          walletName={walletName}
          isLoading={isLoading}
          sidebarTrigger={<SidebarTrigger side={SIDEBAR_SIDE} size="icon" variant="ghost-navbar" />}
        />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <AppSidebar side={SIDEBAR_SIDE} />
    </SidebarProvider>
  )
}
