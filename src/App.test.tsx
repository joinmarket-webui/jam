import { type ReactNode, StrictMode } from 'react'
import { token as tokenMock } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { CancelledError } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createBrowserRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { setIntervalDebounced as setIntervalDebouncedMock } from '@/lib/utils'
import { flushActUpdates } from '@/test/flushActUpdates'
import App, { WalletInfoAutoReload } from './App'

type Holders = {
  walletFileName?: string
  token?: string
  refreshToken?: string
  expiresAt?: number
  authRevision?: number
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
  refetchAllFeeConfig,
  clearJmConfig,
} = vi.hoisted(() => {
  const holders: Holders = {
    walletFileName: 'wallet.jmdat',
    token: 'tok',
    refreshToken: 'refresh',
    expiresAt: Date.now() + 1_800_000,
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
    refetchAllFeeConfig: vi.fn<() => Promise<unknown>>().mockResolvedValue([]),
    clearJmConfig: vi.fn(),
  }
})

vi.mock('zustand', () => ({
  useStore: (store: { getState: () => unknown }, selector: (s: unknown) => unknown) => selector(store.getState()),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-router-dom')>()
  return { ...original, createBrowserRouter: vi.fn(original.createBrowserRouter) }
})

vi.mock('@/store/authStore', () => {
  let signature: string
  let snapshot: { walletFileName?: string; auth?: { token: string; refresh_token?: string; expiresAt?: number } }
  const getSnapshot = () => {
    const nextSignature = JSON.stringify([
      holders.walletFileName,
      holders.token,
      holders.refreshToken,
      holders.expiresAt,
      holders.authRevision,
    ])
    if (signature !== nextSignature) {
      signature = nextSignature
      snapshot = {
        walletFileName: holders.walletFileName,
        auth: holders.token
          ? { token: holders.token, refresh_token: holders.refreshToken, expiresAt: holders.expiresAt }
          : undefined,
      }
    }
    return snapshot
  }
  return {
    authStore: {
      getState: () => ({
        state: getSnapshot(),
        clear: clearAuth,
        update: updateAuth,
      }),
    },
    computeAuthExpiresAt: (expiresInSeconds: number | undefined) =>
      Date.now() + (expiresInSeconds !== undefined ? expiresInSeconds * 1_000 : 1_800_000),
  }
})

vi.mock('@/store/jmConfigStore', () => ({
  jmConfigStore: { getState: () => ({ clear: clearJmConfig }) },
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

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const { CancelledError } = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    CancelledError,
    QueryClientProvider: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    useQuery: () => ({ refetch: vi.fn().mockResolvedValue({}) }),
    useMutation: () => ({ mutateAsync }),
  }
})

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
vi.mock('@/hooks/useFeeConfigValidation', () => ({
  useFeeConfigValidation: () => ({ refetchAll: refetchAllFeeConfig }),
}))
vi.mock('@/hooks/useRefreshSession', () => ({ useRefreshSession: () => undefined }))

vi.mock('./context/JamSessionInfoContext', () => ({
  useRawJmSession: () => ({
    jmSession: holders.jmSession,
    updateSessionInfo: vi.fn(),
  }),
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
  LockWalletConfirmDialog: ({
    onConfirm,
    schedulerRunning,
    coinjoinInProgress,
    makerRunning,
  }: {
    onConfirm: () => void
    schedulerRunning?: boolean
    coinjoinInProgress?: boolean
    makerRunning?: boolean
  }) => (
    <div
      data-testid="lock-dialog"
      data-scheduler-running={schedulerRunning}
      data-coinjoin-in-progress={coinjoinInProgress}
      data-maker-running={makerRunning}
    >
      <button data-testid="confirm-lock" onClick={onConfirm}>
        confirm
      </button>
    </div>
  ),
}))

const appRouter = vi.mocked(createBrowserRouter).mock.results[0].value as ReturnType<typeof createBrowserRouter>

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.pushState({}, '', '/')
    holders.walletFileName = 'wallet.jmdat'
    holders.token = 'tok'
    holders.refreshToken = 'refresh'
    holders.expiresAt = Date.now() + 1_800_000
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

  it.each(['/send', '/sweep'])('renders the wallet page after navigating to %s', async (path) => {
    render(<App />)
    expect(await screen.findByText('main-wallet-page')).toBeInTheDocument()

    await act(() => appRouter.navigate(path))
    expect(await screen.findByText(`${path.slice(1)}-page`)).toBeInTheDocument()

    await act(() => appRouter.navigate('/'))
    expect(await screen.findByText('main-wallet-page')).toBeInTheDocument()
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
    expect(clearJmConfig).toHaveBeenCalled()
  })

  it('opens the lock wallet dialog when schedule is running and confirms locking', async () => {
    holders.jmSession = {
      maker_running: false,
      coinjoin_in_process: false,
      schedule: [{ id: '1' }],
    }
    render(<App />)
    await waitFor(() => expect(screen.getByText('lock')).toBeInTheDocument())

    fireEvent.click(screen.getByText('lock'))
    await waitFor(() => expect(screen.getByTestId('confirm-lock')).toBeInTheDocument())
    expect(screen.getByTestId('lock-dialog')).toHaveAttribute('data-scheduler-running', 'true')
    expect(screen.getByTestId('lock-dialog')).toHaveAttribute('data-coinjoin-in-progress', 'false')

    fireEvent.click(screen.getByTestId('confirm-lock'))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(clearAuth).toHaveBeenCalled()
  })

  it('logs out directly via the layout', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByText('logout')).toBeInTheDocument())
    fireEvent.click(screen.getByText('logout'))
    await waitFor(() => expect(clearAuth).toHaveBeenCalled())
    expect(clearJmConfig).toHaveBeenCalled()
  })

  it('refetches the fee config when a wallet is unlocked', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByText('main-wallet-page')).toBeInTheDocument())
    expect(refetchAllFeeConfig).toHaveBeenCalled()
  })

  it('includes developer routes when developer mode is enabled', async () => {
    holders.developerMode = true
    render(<App />)
    await waitFor(() => expect(screen.getByText('main-wallet-page')).toBeInTheDocument())
  })
})

describe('RefreshApiToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    holders.walletFileName = 'wallet.jmdat'
    holders.token = 'tok'
    holders.refreshToken = 'refresh'
    holders.expiresAt = Date.now() + 1_800_000
    holders.developerMode = false
  })

  // eslint-disable-next-line unicorn/consistent-function-scoping -- okay in tests
  const renderAndGetRenewalCallback = async () => {
    const view = render(<App />)
    await waitFor(() => expect(vi.mocked(setIntervalDebouncedMock)).toHaveBeenCalled())
    const [callback, delay] = vi.mocked(setIntervalDebouncedMock).mock.calls.at(-1)!
    return { callback: callback as () => Promise<void>, delay, unmount: view.unmount }
  }

  it('does not clear auth when a renewal request fails (e.g. a network error)', async () => {
    vi.mocked(tokenMock).mockResolvedValueOnce({ data: undefined, error: new Error('network error') } as never)

    const { callback } = await renderAndGetRenewalCallback()
    await callback()

    expect(clearAuth).not.toHaveBeenCalled()
    expect(updateAuth).not.toHaveBeenCalled()
  })

  it('stores the new expiry deadline on a successful renewal', async () => {
    vi.mocked(tokenMock).mockResolvedValueOnce({
      data: { token: 'new-token', refresh_token: 'new-refresh', expires_in: 1_800 },
    } as never)

    const { callback } = await renderAndGetRenewalCallback()
    await callback()

    expect(updateAuth).toHaveBeenCalledWith({
      auth: expect.objectContaining({
        token: 'new-token',
        refresh_token: 'new-refresh',
        expiresAt: expect.any(Number) as number,
      }) as unknown,
    })
    expect(clearAuth).not.toHaveBeenCalled()
  })

  it.each(['logout', 'new-login', 'same-credentials'])('discards a response after %s', async (transition) => {
    let resolve!: (value: never) => void
    vi.mocked(tokenMock).mockReturnValueOnce(
      new Promise<never>((done) => {
        resolve = done
      }),
    )
    const { callback } = await renderAndGetRenewalCallback()
    const pending = callback()
    if (transition === 'logout') {
      holders.token = undefined
      holders.refreshToken = undefined
    } else if (transition === 'new-login') {
      holders.token = 'new-login'
      holders.refreshToken = 'new-refresh'
    } else {
      // Zustand replaces state on clear/relogin even if credentials are reused.
      holders.authRevision = (holders.authRevision ?? 0) + 1
    }
    resolve({ data: { token: 'late-token', refresh_token: 'late-refresh' } } as never)
    await act(async () => {
      await pending
    })
    expect(updateAuth).not.toHaveBeenCalled()
  })

  it('discards an in-flight response after unmount', async () => {
    let resolve!: (value: never) => void
    vi.mocked(tokenMock).mockReturnValueOnce(
      new Promise<never>((done) => {
        resolve = done
      }),
    )
    const { callback, unmount } = await renderAndGetRenewalCallback()
    const pending = callback()
    unmount()
    resolve({ data: { token: 'late-token', refresh_token: 'late-refresh' } } as never)
    await pending
    expect(updateAuth).not.toHaveBeenCalled()
  })

  it('clears the timer rescheduled after an in-flight renewal is disposed', async () => {
    const { setIntervalDebounced } = await vi.importActual<typeof import('@/lib/utils')>('@/lib/utils')
    let resolve!: (value: never) => void
    vi.mocked(tokenMock).mockReturnValueOnce(
      new Promise<never>((done) => {
        resolve = done
      }),
    )
    const { callback, unmount } = await renderAndGetRenewalCallback()
    const notifyTimer = vi.mocked(setIntervalDebouncedMock).mock.calls.at(-1)![2]

    vi.useFakeTimers()
    try {
      // Run the real loop with the effect's callback and timer registration.
      setIntervalDebounced(callback, 10, notifyTimer)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })
      expect(tokenMock).toHaveBeenCalledTimes(1)
      unmount()
      resolve({ data: { token: 'late-token', refresh_token: 'late-refresh' } } as never)
      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(vi.getTimerCount()).toBe(0)
      expect(updateAuth).not.toHaveBeenCalled()
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('schedules renewal based on the token expiry rather than a fixed interval', async () => {
    holders.expiresAt = Date.now() + 4 * 60_000

    const { delay } = await renderAndGetRenewalCallback()
    const resolvedDelay = typeof delay === 'function' ? delay() : delay

    expect(resolvedDelay).toBeLessThan(4 * 60_000)
    expect(resolvedDelay).toBeGreaterThan(0)
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
    holders.takerRunning = false
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

  describe('when the taker stopped', () => {
    // eslint-disable-next-line unicorn/consistent-function-scoping -- okay in tests
    const renderAndStopTaker = async () => {
      holders.takerRunning = true
      const { rerender } = render(<WalletInfoAutoReload />)
      holders.takerRunning = false
      rerender(<WalletInfoAutoReload />)
      await waitFor(() => expect(refetchWalletBalance).toHaveBeenCalledTimes(1))
    }

    it('does not report a cancelled reload as error (e.g. wallet has been locked meanwhile)', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      refetchWalletBalance.mockRejectedValueOnce(new CancelledError())

      await renderAndStopTaker()

      await flushActUpdates()
      expect(consoleError).not.toHaveBeenCalledWith(
        'Error while auto-reloading wallet info AFTER_TAKER_STOPPED finished',
        expect.anything(),
      )
      consoleError.mockRestore()
    })

    it('reports a failed reload as error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('boom')
      refetchWalletBalance.mockRejectedValueOnce(error)

      await renderAndStopTaker()

      await waitFor(() =>
        expect(consoleError).toHaveBeenCalledWith(
          'Error while auto-reloading wallet info AFTER_TAKER_STOPPED finished',
          error,
        ),
      )
      consoleError.mockRestore()
    })
  })
})
