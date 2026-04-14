import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { lockwalletOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { token } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query'
import type { TFunction } from 'i18next'
import { ThemeProvider } from 'next-themes'
import { useTranslation } from 'react-i18next'
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  useOutletContext,
  type NavigateFunction,
} from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { LogsPage } from '@/components/LogsPage'
import MainWalletPage from '@/components/MainWalletPage'
import SwitchWalletPage from '@/components/SwitchWalletPage'
import CreateWalletPage from '@/components/create/CreateWalletPage'
import { EarnPage } from '@/components/earn/EarnPage'
import ErrorPage from '@/components/error/ErrorPage'
import ImportWalletPage from '@/components/import/ImportWalletPage'
import { Layout } from '@/components/layout/Layout'
import LoginPage from '@/components/login/LoginPage'
import { OrderbookPage } from '@/components/orderbook/OrderbookPage'
import { ReceivePage } from '@/components/receive/ReceivePage'
import { SendPage } from '@/components/send/SendPage'
import { RescanChainPage } from '@/components/settings/RescanChainPage'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { SweepPage } from '@/components/sweep/SweepPage'
import { Toaster } from '@/components/ui/sonner'
import { isDebugFeatureEnabled } from '@/constants/debugFeatures'
import { JAM_API_AUTH_TOKEN_RENEW_INTERVAL, JAM_JM_SESSION_REFRESH_INTERVAL } from '@/constants/jam'
import { routes } from '@/constants/routes'
import { JamDisplayContextProvider } from '@/context/JamDisplayContextProvider'
import { JamWalletInfoContextProvider } from '@/context/JamWalletInfoContextProvider'
import { useApiClient } from '@/hooks/useApiClient'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import { useRefreshSession } from '@/hooks/useRefreshSession'
import { queryClient, withMutationDelay } from '@/lib/queryClient'
import { setIntervalDebounced, walletDisplayName, type WalletFileName } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { jamSettingsStore, useDeveloperMode } from '@/store/jamSettingsStore'
import { EarnReportPage } from './components/earn/report/EarnReportPage'
import { LockWalletConfirmDialog } from './components/ui/jam/LockWalletConfirmDialog'
import { Spinner } from './components/ui/spinner'
import { WalletJarsDetailsPage } from './components/wallet/WalletJarsDetailsPage'
import { useRescanStatus } from './context/JamSessionInfoContext'
import { JamSessionInfoContextProvider } from './context/JamSessionInfoContextProvider'
import { useJamWalletInfoContext } from './context/JamWalletInfoContext'
import { useJmWebsocket } from './hooks/useJmWebsocket'
import { jmSessionStore } from './store/jmSessionStore'
import { jmTxStore, type JmTxInfo } from './store/jmTxStore'
import type { Milliseconds } from './types/global'

const DevSetupPage = lazy(() => import('@/components/dev/DevSetupPage'))
const DevPage = lazy(() => import('@/components/dev/DevPage'))
const DevErrorThrowingComponent = lazy(() => import('@/components/dev/DevErrorThrowingComponent'))

const clearAuthAndQueryCache = () => {
  authStore.getState().clear()
  queryClient.clear()
}

const useWalletFileName = () => useStore(authStore, (state) => state.state?.walletFileName)

const useAuthenticated = () =>
  useStore(authStore, (state) => state.state?.walletFileName !== undefined && state.state?.auth?.token !== undefined)

const ProtectedRoute = () => {
  const walletFileName = useWalletFileName()
  return useAuthenticated() ? (
    <JamSessionInfoContextProvider walletFileName={walletFileName!}>
      <JamWalletInfoContextProvider walletFileName={walletFileName!}>
        {walletFileName && <WalletInfoAutoReload walletFileName={walletFileName} />}
        <Outlet />
      </JamWalletInfoContextProvider>
    </JamSessionInfoContextProvider>
  ) : (
    <Navigate to={routes.login} replace />
  )
}

type LockWalletDialogContext = {
  open: true // always true - otherwise object is `undefined`
  navigate: NavigateFunction
  t: TFunction<'translation', undefined>
}

type LockWalletActionContextValue = {
  onLockWallet: (navigate: NavigateFunction, t: TFunction<'translation', undefined>) => Promise<void>
}

const LoginRoute = () => {
  return useAuthenticated() ? <Navigate to={routes.home} replace /> : <LoginPage />
}

const CreateWalletRoute = () => {
  return useAuthenticated() ? <Navigate to={routes.home} replace /> : <CreateWalletPage />
}

const ImportWalletRoute = () => {
  return useAuthenticated() ? <Navigate to={routes.home} replace /> : <ImportWalletPage />
}

const DevSetupRoute = () => {
  return useDeveloperMode().enabled && isDebugFeatureEnabled('devSetupPage') ? (
    <Suspense fallback={<Loading />}>
      <DevSetupPage />
    </Suspense>
  ) : (
    <Navigate to={routes.login} replace />
  )
}

const DevErrorExampleRoute = () => {
  return useDeveloperMode().enabled && isDebugFeatureEnabled('devErrorExamplePage') ? (
    <Suspense fallback={<Loading />}>
      <DevErrorThrowingComponent />
    </Suspense>
  ) : (
    <Navigate to={routes.login} replace />
  )
}

const useWalletLockController = () => {
  const walletFileName = useWalletFileName()
  const jmSession = useStore(jmSessionStore, (state) => state.state)
  const makerRunning = jmSession?.maker_running === true
  const coinjoinInProgress = jmSession?.coinjoin_in_process === true || (jmSession?.schedule?.length || 0) > 0
  const client = useApiClient()

  const { refetch: refetchLockWallet, isFetching: isLockingWallet } = useQuery(
    {
      ...lockwalletOptions({
        client,
        path: { walletname: encodeURIComponent(walletFileName || '') },
      }),
      enabled: false,
    },
    queryClient,
  )
  const { mutateAsync: lockWalletMutateAsync } = useMutation(
    {
      scope: { id: 'lock-wallet' },
      mutationFn: withMutationDelay(
        async () => {
          return await refetchLockWallet({ throwOnError: true })
        },
        {
          throttle: 210,
        },
      ),
      retry: false,
    },
    queryClient,
  )

  const [lockWalletDialogContext, setLockWalletDialogContext] = useState<LockWalletDialogContext>()

  const doOnLogout = useCallback(async (navigate: NavigateFunction) => {
    clearAuthAndQueryCache()
    await navigate(routes.login)
  }, [])

  const doOnLockWalletConfirm = useCallback(
    async (navigate: NavigateFunction, t: TFunction<'translation', undefined>) => {
      if (!walletFileName) return

      try {
        await lockWalletMutateAsync()
        toast.success(
          t('wallets.wallet_preview.alert_wallet_locked_successfully', {
            walletName: walletDisplayName(walletFileName),
          }),
        )
        setLockWalletDialogContext(undefined)
        await doOnLogout(navigate)
      } catch (error: unknown) {
        const reason = (error instanceof Error ? error.message : undefined) || t('global.errors.reason_unknown')
        toast.error(t('global.errors.error_reloading_wallet_failed', { reason }))
        console.error('Failed to lock wallet:', error)
      }
    },
    [doOnLogout, lockWalletMutateAsync, walletFileName],
  )

  const doOnLockWallet = useCallback(
    async (navigate: NavigateFunction, t: TFunction<'translation', undefined>) => {
      if (!walletFileName) return

      if (makerRunning || coinjoinInProgress) {
        setLockWalletDialogContext({
          open: true,
          navigate,
          t,
        })
      } else {
        await doOnLockWalletConfirm(navigate, t)
      }
    },
    [coinjoinInProgress, makerRunning, doOnLockWalletConfirm, walletFileName],
  )

  return {
    walletFileName,
    doOnLogout,
    doOnLockWallet,
    doOnLockWalletConfirm,
    lockWalletDialogContext,
    setLockWalletDialogContext,
    isLockingWallet,
    makerRunning,
    coinjoinInProgress,
  }
}

const ProtectedNavbarRoute = () => {
  const controller = useWalletLockController()

  if (!controller.walletFileName) {
    return <Navigate to={routes.login} replace />
  }

  return (
    <Layout
      onLogout={controller.doOnLogout}
      onLockWallet={controller.doOnLockWallet}
      walletFileName={controller.walletFileName}
    >
      <Outlet context={{ onLockWallet: controller.doOnLockWallet }} />
    </Layout>
  )
}

const walletFileNameOrRedirect = (Component: React.FC<{ walletFileName: WalletFileName }>) => {
  const Wrapped: React.FC = () => {
    const walletFileName = useWalletFileName()
    return walletFileName ? <Component walletFileName={walletFileName} /> : <Navigate to={routes.login} replace />
  }
  return <Wrapped />
}

const SettingsRoute = () => {
  const walletFileName = useWalletFileName()
  const { onLockWallet } = useOutletContext<LockWalletActionContextValue>()

  return walletFileName ? (
    <SettingsPage walletFileName={walletFileName} onLockWallet={onLockWallet} />
  ) : (
    <Navigate to={routes.login} replace />
  )
}

const DevPageRoute = () => {
  const walletFileName = useWalletFileName()
  return useDeveloperMode().enabled && isDebugFeatureEnabled('devPage') && walletFileName ? (
    <Suspense fallback={<Loading />}>
      <DevPage walletFileName={walletFileName} />
    </Suspense>
  ) : (
    <Navigate to={routes.login} replace />
  )
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route id="base" element={<Outlet />} errorElement={<ErrorPage />}>
      <Route path={routes.login} element={<LoginRoute />} />
      <Route path={routes.createWallet} element={<CreateWalletRoute />} />
      <Route path={routes.importWallet} element={<ImportWalletRoute />} />
      <Route path={routes.__devSetup} element={<DevSetupRoute />} />
      <Route path={routes.__devErrorExample} element={<DevErrorExampleRoute />} />
      <Route id="protected" element={<ProtectedRoute />}>
        <Route id="protected-without-navbar" element={<Outlet />}>
          <Route path={routes.switchWallet} element={walletFileNameOrRedirect(SwitchWalletPage)} />
        </Route>
        <Route id="protected-with-navbar" element={<ProtectedNavbarRoute />}>
          <Route path={routes.home} element={walletFileNameOrRedirect(MainWalletPage)} />
          <Route path={routes.receive} element={walletFileNameOrRedirect(ReceivePage)} />
          <Route path={routes.send} element={walletFileNameOrRedirect(SendPage)} />
          <Route path={routes.earn} element={walletFileNameOrRedirect(EarnPage)} />
          <Route path={routes.earnReport} element={walletFileNameOrRedirect(EarnReportPage)} />
          <Route path={routes.sweep} element={walletFileNameOrRedirect(SweepPage)} />
          <Route path={routes.settings} element={<SettingsRoute />} />
          <Route path={routes.orderbook} element={<OrderbookPage />} />
          <Route path={routes.logs} element={<LogsPage />} />
          <Route path={routes.rescan} element={walletFileNameOrRedirect(RescanChainPage)} />
          <Route path={routes.walletJarsDetails} element={walletFileNameOrRedirect(WalletJarsDetailsPage)} />
          <Route path={routes.__dev} element={<DevPageRoute />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={routes.login} replace />} />
    </Route>,
  ),
)

function App() {
  const walletFileName = useWalletFileName()
  const controller = useWalletLockController()
  const lockWalletDialogContext = controller.lockWalletDialogContext

  return (
    <ThemeProvider defaultTheme="dark" enableSystem>
      <JamDisplayContextProvider>
        <QueryClientProvider client={queryClient}>
          <RefreshApiToken />
          <RefreshJmSession />
          <HandleJmWebsocketMessages />

          {walletFileName && <LoadFeeConfigData walletFileName={walletFileName} />}
          {lockWalletDialogContext && (
            <LockWalletConfirmDialog
              open={lockWalletDialogContext.open}
              onOpenChange={() => controller.setLockWalletDialogContext(undefined)}
              onConfirm={() =>
                controller.doOnLockWalletConfirm(lockWalletDialogContext.navigate, lockWalletDialogContext.t)
              }
              makerRunning={controller.makerRunning}
              coinjoinInProgress={controller.coinjoinInProgress}
            />
          )}
          <RouterProvider router={router} />
          <Toaster closeButton />
        </QueryClientProvider>
      </JamDisplayContextProvider>
    </ThemeProvider>
  )
}

const Loading = () => {
  const { t } = useTranslation()
  return (
    <div className="m-2 flex items-center justify-center gap-2">
      <Spinner className="motion-reduce:hidden" />
      {t('global.loading')}
    </div>
  )
}

function RefreshApiToken() {
  const client = useApiClient()
  const hasRefreshToken = useStore(authStore, (state) => state.state?.auth?.refresh_token !== undefined)

  useEffect(() => {
    if (!hasRefreshToken) return

    let intervalId: NodeJS.Timeout
    setIntervalDebounced(
      async () => {
        const isDevMode = jamSettingsStore.getState().state.developerMode
        const currentRefreshToken = authStore.getState().state?.auth?.refresh_token
        if (currentRefreshToken === undefined) return

        const response = await token({
          client,
          body: {
            grant_type: 'refresh_token',
            refresh_token: currentRefreshToken,
          },
        })

        if (!response.data) {
          clearAuthAndQueryCache()

          if (isDevMode) {
            const message = response.error?.message || response.error?.error_description || 'Unknown error.'
            toast.error(`[DEV] Error while renewing auth token: ${message}`, {
              id: 'token-renew-error',
            })
          }
        } else {
          authStore.getState().update({
            auth: {
              token: response.data.token,
              refresh_token: response.data.refresh_token,
            },
          })
        }
      },
      JAM_API_AUTH_TOKEN_RENEW_INTERVAL,
      (timerId) => (intervalId = timerId),
    )

    return () => {
      clearInterval(intervalId)
    }
  }, [client, hasRefreshToken])

  return <></>
}

function RefreshJmSession() {
  useRefreshSession({
    enabled: true,
    refetchInterval: JAM_JM_SESSION_REFRESH_INTERVAL,
  })

  return <></>
}

type JmTxWebsocketMessage = { txid: string; txdetails: JmTxInfo }
function isJmTxWebsocketMessage(val: unknown): val is JmTxWebsocketMessage {
  return (
    !!val &&
    typeof val === 'object' &&
    'txid' in val &&
    typeof val['txid'] === 'string' &&
    val['txid']?.length === 64 &&
    'txdetails' in val &&
    typeof val['txdetails'] === 'object' &&
    !!val['txdetails'] &&
    'txid' in val['txdetails'] &&
    typeof val['txdetails']['txid'] === 'string' &&
    val['txdetails']?.['txid'] === val['txid'] &&
    true
  )
}

const onWebsocketMessage = (message: unknown) => {
  if (isJmTxWebsocketMessage(message)) {
    jmTxStore.getState().add(message.txdetails)
  }
}

function HandleJmWebsocketMessages() {
  useJmWebsocket({
    enableHeartbeat: false,
    options: {
      onMessage(messageEvent) {
        const message: unknown = (() => {
          try {
            return messageEvent?.data ? (JSON.parse(String(messageEvent.data)) as unknown) : undefined
          } catch (_ignoredOnPurpose) {
            console.warn('Error parsing websocket message', messageEvent.data)
            return undefined
          }
        })()

        if (message !== undefined && message !== null) {
          onWebsocketMessage(message)
        }
      },
    },
  })

  return <></>
}

function LoadFeeConfigData({ walletFileName }: { walletFileName: WalletFileName }) {
  const { fetchMissing } = useFeeConfigValidation({ walletFileName })

  useEffect(() => {
    const isDevMode = jamSettingsStore.getState().state.developerMode
    if (isDevMode) {
      console.debug('[DEV] Reloading fee values...')
    }

    fetchMissing()
      .then((values) => {
        const consoleInfo = 'Fee values loaded successfully.'
        console.info(consoleInfo)
        console.table(values)
        if (isDevMode) {
          toast.success(`[DEV] ${consoleInfo}`, {
            id: 'fee-values-success',
          })
        }
      })
      .catch((error) => {
        const consoleError = 'Error while loading fee values.'
        console.error(consoleError, error)
        if (isDevMode) {
          toast.error(`[DEV] ${consoleError}`)
        }
      })
  }, [fetchMissing])

  return <></>
}

const RELOAD_WALLET_INFO_DELAY: {
  AFTER_RESCAN: Milliseconds
  AFTER_UTXO_CHANGE: Milliseconds
} = {
  // After rescanning, it is necessary to give the JM backend some time to synchronize.
  // A couple of seconds should be enough, however, this depends on the user hardware
  // and the delay might need to be increased if users encounter problems, e.g. the
  // balance changes again when switching views.
  // As reference: 4 seconds was not enough, even on regtest. But keep in mind, this only
  // takes effect after rescanning the chain, which should happen quite infrequently.
  AFTER_RESCAN: 8_000,

  // No delay is needed after utxo change (e.g. normal unlock of wallet)
  AFTER_UTXO_CHANGE: 0,
}

/**
 * A component that automatically reloads wallet information on certain state changes,
 * e.g. when the wallet is unlocked or rescanning the chain finished successfully.
 *
 * If the auto-reloading on wallet change fails, the error can currently
 * only be logged and cannot be displayed to the user in a satisfying way.
 * This might change in the future but is okay for now - components can
 * always trigger a reload on demand and inform the user as they see fit.
 */
const WalletInfoAutoReload = ({ walletFileName }: { walletFileName: WalletFileName }) => {
  const { rescanInfo: currentRescanInfo } = useRescanStatus()
  const { refetch: refetchWalletBalance, utxosHashHex } = useJamWalletInfoContext()
  const [previousRescanning, setPreviousRescanning] = useState<boolean>(currentRescanInfo.rescanning)
  const [rescanningFinished, setRescanningFinished] = useState<boolean>(false)

  if (previousRescanning !== currentRescanInfo.rescanning) {
    setPreviousRescanning(currentRescanInfo.rescanning)
    setRescanningFinished(previousRescanning === true && currentRescanInfo.rescanning === false)
  }

  useQuery({
    queryKey: [
      'reload-wallet-after-rescan-or-utxo-change',
      walletFileName,
      refetchWalletBalance,
      utxosHashHex,
      rescanningFinished,
    ],
    queryFn: async () => {
      const delayBefore: Milliseconds = rescanningFinished
        ? RELOAD_WALLET_INFO_DELAY.AFTER_RESCAN
        : RELOAD_WALLET_INFO_DELAY.AFTER_UTXO_CHANGE
      console.info('Trigger refetch looking for funds after rescan or utxo changes with delay %d...', delayBefore)
      return await refetchWalletBalance({ delayBefore })
    },
  })

  return <></>
}

export default App
