import { type ReactNode, StrictMode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createBrowserRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import App, { WalletInfoAutoReload } from './App'

type Holders = {
  walletFileName?: string
  token?: string
  refreshToken?: string
  developerMode: boolean
  jmSession: Record<string, unknown>
  rescanning: boolean
  blockHeight?: number
  takerRunning: boolean
  utxosHashHex: string
}

const {
  holders,
  clearAuth,
  updateAuth,
  queryClientClear,
  navigateStub,
  refetchWalletBalance,
  mutateAsync,
  fetchMissing,
} = vi.hoisted(() => {
  const holders: Holders = {
    walletFileName: 'wallet.jmdat',
    token: 'tok',
    refreshToken: 'refresh',
    developerMode: false,
    jmSession: { maker_running: true, coinjoin_in_process: false, schedule: [] },
    rescanning: false,
    blockHeight: 100,
    takerRunning: false,
    utxosHashHex: 'initial-hash',
  }
  return {
    holders,
    clearAuth: vi.fn(),
    updateAuth: vi.fn(),
    queryClientClear: vi.fn(),
    navigateStub: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    refetchWalletBalance: vi.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
    mutateAsync: vi.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
    fetchMissing: vi.fn<() => Promise<unknown>>().mockResolvedValue([]),
  }
})

vi.mock('zustand', () => ({
  useStore: (store: { getState: () => unknown }, selector: (s: unknown) => unknown) => selector(store.getState()),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-router-dom')>()
  return { ...original, createBrowserRouter: vi.fn(original.createBrowserRouter) }
})

vi.mock('@/store/authStore', () => ({
  authStore: {
    getState: () => ({
      state: {
        walletFileName: holders.walletFileName,
        auth: holders.token ? { token: holders.token, refresh_token: holders.refreshToken } : undefined,
      },
      clear: clearAuth,
      update: updateAuth,
    }),
  },
}))

vi.mock('./store/jmSessionStore', () => ({
  jmSessionStore: { getState: () => ({ state: holders.jmSession }) },
}))

const mockJmTxStoreState = { state: {} }
vi.mock('./store/jmTxStore', () => ({
  jmTxStore: { getState: () => mockJmTxStoreState },
}))

vi.mock('@/store/jamSettingsStore', () => ({
  jamSettingsStore: { getState: () => ({ state: { developerMode: holders.developerMode } }) },
  useDeveloperMode: () => ({ enabled: holders.developerMode }),
}))

vi.mock('@/constants/debugFeatures', () => ({
  isDebugFeatureEnabled: () => true,
}))

vi.mock('@tanstack/react-query', () => ({
  QueryClientProvider: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  useQuery: () => ({ refetch: vi.fn().mockResolvedValue({}) }),
  useMutation: () => ({ mutateAsync }),
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
  lockwalletOptions: () => ({ queryKey: ['lock'] }),
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/jm', () => ({
  token: vi.fn().mockResolvedValue({ data: { token: 't', refresh_token: 'r' } }),
}))

vi.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/queryClient', () => ({
  queryClient: { clear: queryClientClear },
  withMutationDelay: (function_: unknown) => function_,
}))

vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  setIntervalDebounced: vi.fn(),
  walletDisplayName: (s: string) => s,
}))

vi.mock('./lib/errorReason', () => ({
  getErrorReason: () => 'reason',
}))

vi.mock('@/hooks/useApiClient', () => ({ useApiClient: () => ({}) }))
vi.mock('@/hooks/useFeeConfigValidation', () => ({ useFeeConfigValidation: () => ({ fetchMissing }) }))
vi.mock('@/hooks/useRefreshSession', () => ({ useRefreshSession: () => undefined }))

vi.mock('./context/JamSessionInfoContext', () => ({
  useJamSessionInfoContext: () => ({
    blockHeight: holders.blockHeight,
    takerInfo: { running: holders.takerRunning },
    rescanInfo: { rescanning: holders.rescanning },
  }),
}))
vi.mock('./context/JamWalletInfoContext', () => ({
  useJamWalletInfoContext: () => ({ refetch: refetchWalletBalance, utxosHashHex: holders.utxosHashHex }),
}))

function passthrough(name: string) {
  return ({ children }: { children?: ReactNode }) => <div data-testid={name}>{children}</div>
}

vi.mock('@/context/JamDisplayContextProvider', () => ({ JamDisplayContextProvider: passthrough('display') }))
vi.mock('@/context/JamWalletInfoContextProvider', () => ({
  JamWalletInfoContextProvider: passthrough('wallet-provider'),
}))
vi.mock('./context/JamSessionInfoContextProvider', () => ({
  JamSessionInfoContextProvider: passthrough('session-provider'),
}))
vi.mock('./context/JmWebsocketContextProvider', () => ({ JmWebsocketContextProvider: passthrough('ws') }))

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({
    children,
    onLogout,
    onLockWallet,
  }: {
    children?: ReactNode
    onLogout: (n: () => Promise<void>) => void
    onLockWallet: (n: () => Promise<void>, t: (k: string) => string) => void
  }) => (
    <div>
      <button onClick={() => onLockWallet(navigateStub, (k: string) => k)}>lock</button>
      <button onClick={() => void onLogout(navigateStub)}>logout</button>
      {children}
    </div>
  ),
}))

function stub(name: string) {
  return () => <div>{name}</div>
}

vi.mock('@/components/LogsPage', () => ({ LogsPage: stub('logs-page') }))
vi.mock('@/components/MainWalletPage', () => ({ default: stub('main-wallet-page') }))
vi.mock('@/components/create/CreateWalletPage', () => ({ default: stub('create-page') }))
vi.mock('@/components/earn/EarnPage', () => ({ EarnPage: stub('earn-page') }))
vi.mock('@/components/error/ErrorPage', () => ({ default: stub('error-page') }))
vi.mock('@/components/import/ImportWalletPage', () => ({ default: stub('import-page') }))
vi.mock('@/components/login/LoginPage', () => ({ default: stub('login-page') }))
vi.mock('@/components/orderbook/OrderbookPage', () => ({ OrderbookPage: stub('orderbook-page') }))
vi.mock('@/components/receive/ReceivePage', () => ({ ReceivePage: stub('receive-page') }))
vi.mock('@/components/send/SendPage', () => ({ SendPage: stub('send-page') }))
vi.mock('@/components/settings/RescanChainPage', () => ({ RescanChainPage: stub('rescan-page') }))
vi.mock('@/components/settings/SettingsPage', () => ({ SettingsPage: stub('settings-page') }))
vi.mock('@/components/sweep/SweepPage', () => ({ SweepPage: stub('sweep-page') }))
vi.mock('./components/earn/report/EarnReportPage', () => ({ EarnReportPage: stub('earn-report-page') }))
vi.mock('./components/wallet/WalletJarsDetailsPage', () => ({ WalletJarsDetailsPage: stub('jars-page') }))
vi.mock('@/components/ui/sonner', () => ({ Toaster: () => <div data-testid="toaster" /> }))
vi.mock('./components/ui/spinner', () => ({ Spinner: () => <div data-testid="spinner" /> }))

vi.mock('./components/ui/jam/LockWalletConfirmDialog', () => ({
  LockWalletConfirmDialog: ({ onConfirm }: { onConfirm: () => void }) => (
    <button data-testid="confirm-lock" onClick={onConfirm}>
      confirm
    </button>
  ),
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.pushState({}, '', '/')
    holders.walletFileName = 'wallet.jmdat'
    holders.token = 'tok'
    holders.refreshToken = 'refresh'
    holders.developerMode = false
    holders.jmSession = { maker_running: true, coinjoin_in_process: false, schedule: [] }
    holders.rescanning = false
    holders.blockHeight = 100
    holders.takerRunning = false
    holders.utxosHashHex = 'initial-hash'
  })

  it('renders the home page when authenticated', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByText('main-wallet-page')).toBeInTheDocument())
    expect(screen.getByTestId('session-provider')).toBeInTheDocument()
    expect(screen.getByTestId('wallet-provider')).toBeInTheDocument()
    expect(screen.getByTestId('toaster')).toBeInTheDocument()
  })

  it('keeps the router stable across app rerenders', async () => {
    const { rerender } = render(<App />)
    await waitFor(() => expect(screen.getByText('main-wallet-page')).toBeInTheDocument())
    const routerCreations = vi.mocked(createBrowserRouter).mock.calls.length

    rerender(<App />)

    expect(createBrowserRouter).toHaveBeenCalledTimes(routerCreations)
  })

  it('redirects to login when not authenticated', async () => {
    holders.token = undefined
    render(<App />)
    await waitFor(() => expect(screen.getByText('login-page')).toBeInTheDocument())
  })

  it('opens the lock wallet dialog when maker is running and confirms locking', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByText('lock')).toBeInTheDocument())

    fireEvent.click(screen.getByText('lock'))
    await waitFor(() => expect(screen.getByTestId('confirm-lock')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('confirm-lock'))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(clearAuth).toHaveBeenCalled()
  })

  it('logs out directly via the layout', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByText('logout')).toBeInTheDocument())
    fireEvent.click(screen.getByText('logout'))
    await waitFor(() => expect(clearAuth).toHaveBeenCalled())
  })

  it('includes developer routes when developer mode is enabled', async () => {
    holders.developerMode = true
    render(<App />)
    await waitFor(() => expect(screen.getByText('main-wallet-page')).toBeInTheDocument())
  })
})

describe('WalletInfoAutoReload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    holders.walletFileName = 'wallet.jmdat'
    holders.token = 'tok'
    holders.refreshToken = 'refresh'
    holders.jmSession = { maker_running: true, coinjoin_in_process: false, schedule: [] }
    holders.utxosHashHex = 'initial-hash'
  })

  it('skips refetch on initial mount but refetches on subsequent utxosHashHex changes', async () => {
    const { rerender } = render(
      <StrictMode>
        <WalletInfoAutoReload />
      </StrictMode>,
    )

    // 1. Verify refetchWalletBalance is NOT called because of the initial mount
    expect(refetchWalletBalance).not.toHaveBeenCalled()

    // 2. A subsequent utxosHashHex change DOES call refetchWalletBalance
    holders.utxosHashHex = 'changed-hash-1'
    rerender(
      <StrictMode>
        <WalletInfoAutoReload />
      </StrictMode>,
    )
    await waitFor(() => expect(refetchWalletBalance).toHaveBeenCalledTimes(1))

    // 3. Multiple subsequent UTXO hash changes continue to trigger refetches
    holders.utxosHashHex = 'changed-hash-2'
    rerender(
      <StrictMode>
        <WalletInfoAutoReload />
      </StrictMode>,
    )
    await waitFor(() => expect(refetchWalletBalance).toHaveBeenCalledTimes(2))

    // 4. Test that the existing refetch behavior arguments remain unchanged
    // It should be called with { delayBefore: 210, signal: <AbortSignal> }
    expect(refetchWalletBalance).toHaveBeenLastCalledWith(
      expect.objectContaining({
        delayBefore: 210,
        signal: expect.any(AbortSignal) as unknown as AbortSignal,
      }),
    )

    // 6. Test that same hash doesn't trigger another refetch
    rerender(
      <StrictMode>
        <WalletInfoAutoReload />
      </StrictMode>,
    )
    expect(refetchWalletBalance).toHaveBeenCalledTimes(2)
  })
})
