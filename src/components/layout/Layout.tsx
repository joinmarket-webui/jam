import { useTheme } from 'next-themes'
import { AppFooter } from '@/components/layout/AppFooter'
import { AppNavbar } from '@/components/layout/AppNavbar'
import { Sidebar, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { useJamDisplayContext } from '@/context/JamDisplayContext'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
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
        <AppNavbar
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
        <AppFooter />
      </div>
      <AppSidebar side={SIDEBAR_SIDE} />
    </SidebarProvider>
  )
}
