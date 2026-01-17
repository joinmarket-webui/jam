import { useState } from 'react'
import type { TFunction } from 'i18next'
import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'
import { useNavigate, type NavigateFunction } from 'react-router-dom'
import { useStore } from 'zustand'
import { AppFooter } from '@/components/layout/AppFooter'
import { AppNavbar } from '@/components/layout/AppNavbar'
import { Sidebar, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { useSidebar } from '@/components/ui/use-sidebar'
import { APP_DISPLAY_VERSION } from '@/constants/jam'
import { useJamDisplayContext } from '@/context/JamDisplayContext'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import { useCheatsheet } from '@/hooks/useCheatsheet'
import { useJmInfo } from '@/hooks/useJmInfo'
import { useJmWebsocket } from '@/hooks/useJmWebsocket'
import { jmSessionStore } from '@/store/jmSessionStore'
import { OrderbookOverlay } from '../orderbook/OrderbookOverlay'
import { Cheatsheet } from '../ui/jam/Cheatsheet'
import { AppSidebar } from './AppSidebar'

const SIDEBAR_SIDE: React.ComponentProps<typeof Sidebar>['side'] = 'right'

interface LayoutInnerProps {
  onLogout: (navigate: NavigateFunction) => Promise<void>
  onLockWallet: (navigate: NavigateFunction, t: TFunction<'translation', undefined>) => Promise<void>
  children: React.ReactNode
}

export function LayoutInner({ onLogout, onLockWallet, children }: LayoutInnerProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const jmSessionState = useStore(jmSessionStore, (state) => state.state)

  const { version: joinmarketVersion } = useJmInfo()

  const { resolvedTheme, setTheme } = useTheme()
  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

  const { formatAmount, currencySymbol } = useJamDisplayContext()
  const { walletBalanceSummary, walletName, isLoading } = useJamWalletInfoContext()

  const sidebarContext = useSidebar()

  const websocket = useJmWebsocket()

  const cheatsheet = useCheatsheet()
  const [isOrderbookOverlayOpen, setIsOrderbookOverlayOpen] = useState(false)

  return (
    <div className="light:bg-white light:text-black flex min-h-screen flex-1 flex-col bg-[#181b20] text-white transition-colors duration-300">
      <AppNavbar
        theme={resolvedTheme || 'dark'}
        isLoading={isLoading}
        walletName={walletName}
        totalBalance={walletBalanceSummary.calculatedTotalBalanceInSats}
        toggleTheme={toggleTheme}
        formatAmount={formatAmount}
        currencySymbol={currencySymbol}
        onLogout={async () => await onLogout(navigate)}
        onLockWallet={async () => await onLockWallet(navigate, t)}
        sidebarTrigger={<SidebarTrigger side={SIDEBAR_SIDE} size="icon" variant="ghost-navbar" />}
        sessionInfo={jmSessionState}
        sidebarInfo={sidebarContext}
      />
      <main className="flex-1">{children}</main>
      <AppFooter
        websocketInfo={websocket}
        jamVersion={APP_DISPLAY_VERSION}
        joinmarketVersion={joinmarketVersion}
        onClickCheatsheet={() => cheatsheet.onOpenChange(true)}
        onClickOrderbook={() => setIsOrderbookOverlayOpen(true)}
      />

      <Cheatsheet open={cheatsheet.open} onOpenChange={cheatsheet.onOpenChange} />
      <OrderbookOverlay open={isOrderbookOverlayOpen} onOpenChange={setIsOrderbookOverlayOpen} />
    </div>
  )
}

interface LayoutProps {
  onLogout: (navigate: NavigateFunction) => Promise<void>
  onLockWallet: (navigate: NavigateFunction, t: TFunction<'translation', undefined>) => Promise<void>
  children: React.ReactNode
}

export function Layout({ onLogout, onLockWallet, children }: LayoutProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <LayoutInner onLogout={onLogout} onLockWallet={onLockWallet}>
        {children}
      </LayoutInner>
      <AppSidebar side={SIDEBAR_SIDE} />
    </SidebarProvider>
  )
}
