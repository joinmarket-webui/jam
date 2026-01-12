import { useTheme } from 'next-themes'
import { useNavigate } from 'react-router-dom'
import { useStore } from 'zustand'
import { AppFooter } from '@/components/layout/AppFooter'
import { AppNavbar } from '@/components/layout/AppNavbar'
import { Sidebar, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { routes } from '@/constants/routes'
import { useJamDisplayContext } from '@/context/JamDisplayContext'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import { useJmWebsocket } from '@/hooks/useJmWebsocket'
import { authStore } from '@/store/authStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { useSidebar } from '../ui/use-sidebar'
import { AppSidebar } from './AppSidebar'

const SIDEBAR_SIDE: React.ComponentProps<typeof Sidebar>['side'] = 'right'

interface LayoutInnerProps {
  children: React.ReactNode
}

export function LayoutInner({ children }: LayoutInnerProps) {
  const navigate = useNavigate()

  const { clear: clearAuth } = useStore(authStore, (state) => state)
  const jmSessionState = useStore(jmSessionStore, (state) => state.state)

  const { resolvedTheme, setTheme } = useTheme()
  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

  const { formatAmount, currencySymbol } = useJamDisplayContext()
  const { totalBalance, walletName, isLoading } = useJamWalletInfoContext()

  const sidebarContext = useSidebar()

  const websocket = useJmWebsocket()

  const doOnLogout = async () => {
    clearAuth()
    await navigate(routes.login)
  }

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
        onLogout={doOnLogout}
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
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <LayoutInner>{children}</LayoutInner>
      <AppSidebar side={SIDEBAR_SIDE} />
    </SidebarProvider>
  )
}
