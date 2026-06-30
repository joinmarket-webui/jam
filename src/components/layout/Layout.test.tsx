import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WalletFileName } from '@/lib/utils'
import { Layout } from './Layout'

type SessionState = {
  block_height?: number
}

const mocks = vi.hoisted(() => ({
  cheatsheetOpen: false,
  logsFeature: true,
  navigate: vi.fn(),
  onCheatsheetOpenChange: vi.fn<(open: boolean) => void>(),
  pathname: '/',
  setTheme: vi.fn(),
  theme: 'dark',
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('react-router-dom', () => ({
  useLocation: () => ({
    pathname: mocks.pathname,
  }),
  useNavigate: () => mocks.navigate,
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: mocks.theme,
    setTheme: mocks.setTheme,
  }),
}))

vi.mock('zustand', () => ({
  useStore: (_store: unknown, selector?: (state: { state: SessionState }) => unknown) => {
    const state = { state: { block_height: 123 } }
    return selector ? selector(state) : state
  },
}))

vi.mock('@/store/jmSessionStore', () => ({
  jmSessionStore: 'jm-session-store',
}))

vi.mock('@/components/layout/AppNavbar', () => ({
  AppNavbar: ({
    onLockWallet,
    onLogout,
    sessionInfo,
    sidebarTrigger,
    theme,
    toggleTheme,
    totalBalance,
    walletName,
  }: {
    onLockWallet: () => Promise<void>
    onLogout: () => Promise<void>
    sessionInfo?: SessionState
    sidebarTrigger: ReactNode
    theme: string
    toggleTheme: () => void
    totalBalance: number
    walletName: string
  }) => (
    <nav>
      navbar:{theme}:{walletName}:{totalBalance}:{sessionInfo?.block_height}
      {sidebarTrigger}
      <button type="button" onClick={toggleTheme}>
        toggle-theme
      </button>
      <button type="button" onClick={() => void onLogout()}>
        logout
      </button>
      <button type="button" onClick={() => void onLockWallet()}>
        lock-wallet
      </button>
    </nav>
  ),
}))

vi.mock('@/components/layout/AppFooter', () => ({
  AppFooter: ({
    blockHeight,
    joinmarketVersion,
    onClickCheatsheet,
    onClickLogs,
    onClickOrderbook,
  }: {
    blockHeight?: number
    joinmarketVersion?: string
    onClickCheatsheet: () => void
    onClickLogs?: () => void
    onClickOrderbook: () => void
  }) => (
    <footer>
      footer:{blockHeight}:{joinmarketVersion}
      <button type="button" onClick={onClickCheatsheet}>
        open-cheatsheet
      </button>
      <button type="button" onClick={onClickOrderbook}>
        open-orderbook
      </button>
      {onClickLogs && (
        <button type="button" onClick={onClickLogs}>
          open-logs
        </button>
      )}
    </footer>
  ),
}))

vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children, defaultOpen }: { children: ReactNode; defaultOpen: boolean }) => (
    <div data-default-open={String(defaultOpen)}>{children}</div>
  ),
  SidebarTrigger: ({ side }: { side: string }) => <button type="button">sidebar-trigger:{side}</button>,
}))

vi.mock('@/components/ui/use-sidebar', () => ({
  useSidebar: () => ({
    open: false,
    toggleSidebar: vi.fn(),
  }),
}))

vi.mock('@/context/JamSessionInfoContext', () => ({
  useRescanStatus: () => ({
    rescanInfo: undefined,
  }),
}))

vi.mock('@/context/JamWalletInfoContext', () => ({
  useJamWalletInfoContext: () => ({
    isFetching: false,
    isLoading: false,
    walletBalanceSummary: {
      calculatedTotalBalanceInSats: 9876,
    },
    walletName: 'test-wallet',
  }),
}))

vi.mock('@/context/JmWebsocketContext', () => ({
  useJmWebsocketContext: () => ({
    websocket: { connected: true },
  }),
}))

vi.mock('@/hooks/useCheatsheet', () => ({
  useCheatsheet: () => ({
    onOpenChange: mocks.onCheatsheetOpenChange,
    open: mocks.cheatsheetOpen,
  }),
}))

vi.mock('@/hooks/useFeatures', () => ({
  useFeatures: () => ({
    isFeatureEnabled: (feature: string) => feature === 'logs' && mocks.logsFeature,
  }),
}))

vi.mock('@/hooks/useQueryJmInfo', () => ({
  useQueryJmInfo: () => ({
    version: 'jm-version',
  }),
}))

vi.mock('@/components/ui/jam/Cheatsheet', () => ({
  Cheatsheet: ({ open }: { open: boolean }) => <div>cheatsheet:{String(open)}</div>,
}))

vi.mock('@/components/orderbook/OrderbookOverlay', () => ({
  OrderbookOverlay: ({ open }: { open: boolean }) => <div>orderbook-overlay:{String(open)}</div>,
}))

vi.mock('@/components/LogsOverlay', () => ({
  LogsOverlay: ({ open }: { open: boolean }) => <div>logs-overlay:{String(open)}</div>,
}))

vi.mock('@/components/layout/AppSidebar', () => ({
  AppSidebar: ({ side }: { side: string }) => <aside>sidebar:{side}</aside>,
}))

vi.mock('@/components/layout/PostLoginOnboardingTour', () => ({
  PostLoginOnboardingTour: ({ enabled }: { enabled: boolean }) => <div>tour-enabled:{String(enabled)}</div>,
}))

const walletFileName = 'wallet.jmdat' as WalletFileName

describe('Layout', () => {
  beforeEach(() => {
    mocks.cheatsheetOpen = false
    mocks.logsFeature = true
    mocks.pathname = '/'
    mocks.theme = 'dark'
    mocks.navigate.mockReset()
    mocks.onCheatsheetOpenChange.mockReset()
    mocks.setTheme.mockReset()
  })

  it('wires navbar, footer actions, overlays, and shortcuts', async () => {
    const onLogout = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    const onLockWallet = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

    render(
      <Layout walletFileName={walletFileName} onLogout={onLogout} onLockWallet={onLockWallet}>
        <section>page-content</section>
      </Layout>,
    )

    expect(screen.getByText('page-content')).toBeInTheDocument()
    expect(screen.getByText('navbar:dark:test-wallet:9876:123')).toBeInTheDocument()
    expect(screen.getByText('footer:123:jm-version')).toBeInTheDocument()
    expect(screen.getByText('sidebar:right')).toBeInTheDocument()
    expect(screen.getByText('tour-enabled:true')).toBeInTheDocument()

    fireEvent.click(screen.getByText('toggle-theme'))
    expect(mocks.setTheme).toHaveBeenCalledWith('light')

    fireEvent.click(screen.getByText('logout'))
    fireEvent.click(screen.getByText('lock-wallet'))

    await waitFor(() => {
      expect(onLogout).toHaveBeenCalledTimes(1)
      expect(onLockWallet).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByText('open-cheatsheet'))
    expect(mocks.onCheatsheetOpenChange).toHaveBeenCalledWith(true)

    fireEvent.click(screen.getByText('open-orderbook'))
    expect(screen.getByText('orderbook-overlay:true')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'l', metaKey: true })
    expect(screen.getByText('logs-overlay:true')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'l', ctrlKey: true })
    expect(screen.getByText('logs-overlay:false')).toBeInTheDocument()
  })

  it('disables logs and onboarding when the route or feature state requires it', () => {
    mocks.cheatsheetOpen = true
    mocks.logsFeature = false
    mocks.pathname = '/send'

    render(
      <Layout walletFileName={walletFileName} onLogout={vi.fn()} onLockWallet={vi.fn()}>
        <section>send-content</section>
      </Layout>,
    )

    expect(screen.queryByText('open-logs')).not.toBeInTheDocument()
    expect(screen.getByText('cheatsheet:true')).toBeInTheDocument()
    expect(screen.getByText('tour-enabled:false')).toBeInTheDocument()
  })
})
