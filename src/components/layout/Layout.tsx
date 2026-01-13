import { useTheme } from 'next-themes'
import { useNavigate, type NavigateFunction } from 'react-router-dom'
import { useStore } from 'zustand'
import { AppFooter } from '@/components/layout/AppFooter'
import { AppNavbar } from '@/components/layout/AppNavbar'
import { Sidebar, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { useSidebar } from '@/components/ui/use-sidebar'
import { useJamDisplayContext } from '@/context/JamDisplayContext'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import { useJmWebsocket } from '@/hooks/useJmWebsocket'
import { jmSessionStore } from '@/store/jmSessionStore'
import { AppSidebar } from './AppSidebar'

const SIDEBAR_SIDE: React.ComponentProps<typeof Sidebar>['side'] = 'right'

interface LayoutInnerProps {
  onLogout: (navigate: NavigateFunction) => Promise<void>
  children: React.ReactNode
}

export function LayoutInner({ onLogout, children }: LayoutInnerProps) {
  const navigate = useNavigate()
  const jmSessionState = useStore(jmSessionStore, (state) => state.state)

  const { resolvedTheme, setTheme } = useTheme()
  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

  const { formatAmount, currencySymbol } = useJamDisplayContext()
  const { totalBalance, walletName, isLoading } = useJamWalletInfoContext()

  const sidebarContext = useSidebar()

  const websocket = useJmWebsocket()

  return (
    <div className="light:bg-white light:text-black flex min-h-screen flex-1 flex-col bg-[#181b20] text-white transition-colors duration-300">
      <AppNavbar
        theme={resolvedTheme || 'dark'}
        isLoading={isLoading}
        walletName={walletName}
        totalBalance={totalBalance}
        toggleTheme={toggleTheme}
        formatAmount={formatAmount}
        currencySymbol={currencySymbol}
        onLogout={() => onLogout(navigate)}
        sidebarTrigger={<SidebarTrigger side={SIDEBAR_SIDE} size="icon" variant="ghost-navbar" />}
        sessionInfo={jmSessionState}
        sidebarInfo={sidebarContext}
      />
      <main className="flex-1">{children}</main>
      <AppFooter websocketInfo={websocket} />
    </div>
  )
}

interface LayoutProps {
  onLogout: (navigate: NavigateFunction) => Promise<void>
  children: React.ReactNode
}

export function Layout({ onLogout, children }: LayoutProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <LayoutInner onLogout={onLogout}>{children}</LayoutInner>
      <AppSidebar side={SIDEBAR_SIDE} />
    </SidebarProvider>
  )
}
