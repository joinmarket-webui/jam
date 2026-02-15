import { useState, useEffect } from 'react'
import type { TFunction } from 'i18next'
import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, type NavigateFunction } from 'react-router-dom'
import { useStore } from 'zustand'
import { AppFooter } from '@/components/layout/AppFooter'
import { AppNavbar } from '@/components/layout/AppNavbar'
import { Sidebar, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { useSidebar } from '@/components/ui/use-sidebar'
import { APP_DISPLAY_VERSION, JAM_DEFAULT_THEME } from '@/constants/jam'
import { routes } from '@/constants/routes'
import { useRescanStatus } from '@/context/JamSessionInfoContext'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import { useCheatsheet } from '@/hooks/useCheatsheet'
import { useFeatures } from '@/hooks/useFeatures'
import { useJmWebsocket } from '@/hooks/useJmWebsocket'
import { useQueryJmInfo } from '@/hooks/useQueryJmInfo'
import type { WalletFileName } from '@/lib/utils'
import { jmSessionStore } from '@/store/jmSessionStore'
import { LogsOverlay } from '../LogsOverlay'
import { OrderbookOverlay } from '../orderbook/OrderbookOverlay'
import { Cheatsheet } from '../ui/jam/Cheatsheet'
import { AppSidebar } from './AppSidebar'
import { PostLoginOnboardingTour } from './PostLoginOnboardingTour'

const SIDEBAR_SIDE: React.ComponentProps<typeof Sidebar>['side'] = 'right'

type LayoutInnerProps = {
  onLogout: (navigate: NavigateFunction) => Promise<void>
  onLockWallet: (navigate: NavigateFunction, t: TFunction<'translation', undefined>) => Promise<void>
  children: React.ReactNode
}

export function LayoutInner({ onLogout, onLockWallet, children }: LayoutInnerProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const jmSession = useStore(jmSessionStore, (state) => state.state)
  const rescanStatus = useRescanStatus()

  const { version: joinmarketVersion } = useQueryJmInfo()

  const { resolvedTheme = JAM_DEFAULT_THEME, setTheme } = useTheme()
  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

  const { walletBalanceSummary, walletName, isLoading, isFetching } = useJamWalletInfoContext()

  const sidebarContext = useSidebar()

  const websocket = useJmWebsocket({
    enableHeartbeat: true,
  })

  const cheatsheet = useCheatsheet()
  const [isOrderbookOverlayOpen, setIsOrderbookOverlayOpen] = useState(false)
  const [isLogsOverlayOpen, setIsLogsOverlayOpen] = useState(false)
  const { isFeatureEnabled } = useFeatures()
  const isHomeRoute = location.pathname === routes.home

  // Adds a keyboard shortcut to toggle the logs overlay.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'l' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setIsLogsOverlayOpen((open) => !open)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="light:bg-white light:text-black flex min-h-screen flex-1 flex-col bg-[#181b20] text-white transition-colors duration-300">
      <AppNavbar
        theme={resolvedTheme}
        isLoading={isLoading}
        isReloading={isFetching}
        rescanInfo={rescanStatus.rescanInfo}
        walletName={walletName}
        totalBalance={walletBalanceSummary.calculatedTotalBalanceInSats}
        toggleTheme={toggleTheme}
        onLogout={async () => await onLogout(navigate)}
        onLockWallet={async () => await onLockWallet(navigate, t)}
        sidebarTrigger={<SidebarTrigger side={SIDEBAR_SIDE} size="icon" variant="ghost-navbar" />}
        sessionInfo={jmSession}
        sidebarInfo={sidebarContext}
      />
      <main className="flex-1">{children}</main>
      <AppFooter
        websocketInfo={websocket}
        jamVersion={APP_DISPLAY_VERSION}
        joinmarketVersion={joinmarketVersion}
        onClickCheatsheet={() => cheatsheet.onOpenChange(true)}
        onClickOrderbook={() => setIsOrderbookOverlayOpen(true)}
        onClickLogs={isFeatureEnabled('logs') ? () => setIsLogsOverlayOpen(true) : undefined}
      />

      <Cheatsheet open={cheatsheet.open} onOpenChange={cheatsheet.onOpenChange} />
      <OrderbookOverlay open={isOrderbookOverlayOpen} onOpenChange={setIsOrderbookOverlayOpen} />
      <LogsOverlay open={isLogsOverlayOpen} onOpenChange={setIsLogsOverlayOpen} />
      <PostLoginOnboardingTour enabled={isHomeRoute} />
    </div>
  )
}

type LayoutProps = LayoutInnerProps & {
  walletFileName: WalletFileName
}

export function Layout({ walletFileName: _ignoredOnPurpose, onLogout, onLockWallet, children }: LayoutProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <LayoutInner onLogout={onLogout} onLockWallet={onLockWallet}>
        {children}
      </LayoutInner>
      <AppSidebar side={SIDEBAR_SIDE} />
    </SidebarProvider>
  )
}
