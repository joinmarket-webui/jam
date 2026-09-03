import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { ComponentType, PropsWithChildren } from 'react'
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
  type NavigateFunction,
  useOutletContext,
} from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { LogsPage } from '@/components/LogsPage'
import MainWalletPage from '@/components/MainWalletPage'
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
import { RootLayout } from './components/layout/RootLayout'
import { LockWalletConfirmDialog } from './components/ui/jam/LockWalletConfirmDialog'
import { Spinner } from './components/ui/spinner'
import { TxHistoryPage } from './components/wallet/TxHistoryPage'
import { WalletJarsDetailsPage } from './components/wallet/WalletJarsDetailsPage'
import { useJamSession, useJamSessionInfoContext } from './context/JamSessionInfoContext'
import { JamSessionInfoContextProvider } from './context/JamSessionInfoContextProvider'
import { useJamWalletInfoContext } from './context/JamWalletInfoContext'
import { JmWebsocketContextProvider } from './context/JmWebsocketContextProvider'
import { getErrorReason } from './lib/errorReason'
import { jmTxStore, type JmTxInfos } from './store/jmTxStore'
import type { Milliseconds } from './types/global'

const DevSetupPage = lazy(() => import('@/components/dev/DevSetupPage'))
const DevPage = lazy(() => import('@/components/dev/DevPage'))
const DevErrorThrowingComponent = lazy(() => import('@/components/dev/DevErrorThrowingComponent'))

const clearAuthAndQueryCache = () => {
  authStore.getState().clear()
  queryClient.clear()
}

const doOnLogout = async (navigate: NavigateFunction) => {
  clearAuthAndQueryCache()
  await navigate(routes.login)
}

type LockWalletDialogContext = {
  open: true // always true - otherwise object is `undefined`
  navigate: NavigateFunction
  t: TFunction<'translation', undefined>
}

type LockWalletHandler = (navigate: NavigateFunction, t: TFunction<'translation', undefined>) => Promise<void>

type ProtectedNavbarRouteContext = {
  walletFileName: WalletFileName
  onLockWallet: LockWalletHandler
}

const useAuthenticatedWalletFileName = () =>
  useStore(authStore, (state) =>
    state.state?.walletFileName && state.state.auth?.token ? state.state.walletFileName : undefined,
  )

const AnonymousRoute = () => {
  return useAuthenticatedWalletFileName() ? <Navigate to={routes.home} replace /> : <Outlet />
}

const ProtectedRoute = () => {
  const walletFileName = useAuthenticatedWalletFileName()

  return walletFileName ? (
    <JamWalletInfoContextProvider walletFileName={walletFileName}>
      <WalletInfoAutoReload />
      <Outlet context={walletFileName} />
    </JamWalletInfoContextProvider>
  ) : (
    <Navigate to={routes.login} replace />
  )
}

const ProtectedNavbarRoute = () => {
  const walletFileName = useOutletContext<WalletFileName>()
  const { jmSession } = useJamSession()
  const makerRunning = jmSession?.maker_running === true
  const coinjoinInProgress = jmSession?.coinjoin_in_process === true || (jmSession?.schedule?.length || 0) > 0
  const client = useApiClient()
  const lockWalletQuery = useQuery(
    {
      ...lockwalletOptions({
        client,
        path: { walletname: walletFileName || '' },
      }),
      enabled: false,
    },
    queryClient,
  )
  const lockWalletMutation = useMutation(
    {
      scope: { id: 'lock-wallet' },
      mutationFn: withMutationDelay(
        async () => {
          return await lockWalletQuery.refetch({ throwOnError: true })
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

  const doOnLockWalletConfirm = async (navigate: NavigateFunction, t: TFunction<'translation', undefined>) => {
    try {
      await lockWalletMutation.mutateAsync()
      toast.success(
        t('wallets.wallet_preview.alert_wallet_locked_successfully', { walletName: walletDisplayName(walletFileName) }),
      )
      setLockWalletDialogContext(undefined)
      await doOnLogout(navigate)
    } catch (error: unknown) {
      const reason = (error instanceof Error ? error.message : undefined) || t('global.errors.reason_unknown')
      toast.error(t('global.errors.error_reloading_wallet_failed', { reason }))
      console.error('Failed to lock wallet:', error)
    }
  }

  const doOnLockWallet: LockWalletHandler = async (navigate, t) => {
    if (makerRunning || coinjoinInProgress) {
      setLockWalletDialogContext({ open: true, navigate, t })
    } else {
      await doOnLockWalletConfirm(navigate, t)
    }
  }

  return (
    <>
      <Layout onLogout={doOnLogout} onLockWallet={doOnLockWallet} walletFileName={walletFileName}>
        <Outlet context={{ walletFileName, onLockWallet: doOnLockWallet } satisfies ProtectedNavbarRouteContext} />
      </Layout>
      {lockWalletDialogContext && (
        <LockWalletConfirmDialog
          open={lockWalletDialogContext.open}
          onOpenChange={() => setLockWalletDialogContext(undefined)}
          onConfirm={() => doOnLockWalletConfirm(lockWalletDialogContext.navigate, lockWalletDialogContext.t)}
          makerRunning={makerRunning}
          coinjoinInProgress={coinjoinInProgress}
        />
      )}
    </>
  )
}

const DeveloperRoute = ({
  feature,
  children,
}: PropsWithChildren<{ feature: Parameters<typeof isDebugFeatureEnabled>[0] }>) => {
  const { enabled } = useDeveloperMode()
  return enabled && isDebugFeatureEnabled(feature) ? <>{children}</> : <Navigate to={routes.login} replace />
}

const WalletPageRoute = ({ component: Page }: { component: ComponentType<{ walletFileName: WalletFileName }> }) => {
  const { walletFileName } = useOutletContext<ProtectedNavbarRouteContext>()
  return <Page walletFileName={walletFileName} />
}

const SettingsRoute = () => {
  const { walletFileName, onLockWallet } = useOutletContext<ProtectedNavbarRouteContext>()
  return <SettingsPage walletFileName={walletFileName} onLockWallet={onLockWallet} />
}

const RescanRoute = () => {
  const { walletFileName } = useOutletContext<ProtectedNavbarRouteContext>()
  return <RescanChainPage walletFileName={walletFileName} backLinkTarget="settings" />
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      id="base"
      element={
        <RootLayout>
          <Outlet />
        </RootLayout>
      }
      errorElement={<ErrorPage />}
    >
      <Route element={<AnonymousRoute />}>
        <Route path={routes.login} element={<LoginPage />} />
        <Route path={routes.createWallet} element={<CreateWalletPage />} />
        <Route path={routes.importWallet} element={<ImportWalletPage />} />
      </Route>
      <Route
        path={routes.__devSetup}
        element={
          <DeveloperRoute feature="devSetupPage">
            <Suspense fallback={<Loading />}>
              <DevSetupPage />
            </Suspense>
          </DeveloperRoute>
        }
      />
      <Route
        path={routes.__devErrorExample}
        element={
          <DeveloperRoute feature="devErrorExamplePage">
            <Suspense fallback={<Loading />}>
              <DevErrorThrowingComponent />
            </Suspense>
          </DeveloperRoute>
        }
      />
      <Route id="protected" element={<ProtectedRoute />}>
        <Route id="protected-with-navbar" element={<ProtectedNavbarRoute />}>
          <Route path={routes.home} element={<WalletPageRoute component={MainWalletPage} />} />
          <Route path={routes.receive} element={<WalletPageRoute component={ReceivePage} />} />
          <Route path={routes.send} element={<WalletPageRoute component={SendPage} />} />
          <Route path={routes.earn} element={<WalletPageRoute component={EarnPage} />} />
          <Route path={routes.earnReport} element={<WalletPageRoute component={EarnReportPage} />} />
          <Route path={routes.sweep} element={<WalletPageRoute component={SweepPage} />} />
          <Route path={routes.settings} element={<SettingsRoute />} />
          <Route path={routes.orderbook} element={<OrderbookPage />} />
          <Route path={routes.logs} element={<LogsPage />} />
          <Route path={routes.rescan} element={<RescanRoute />} />
          <Route path={routes.walletJarsDetails} element={<WalletPageRoute component={WalletJarsDetailsPage} />} />
          <Route path={routes.txHistory} element={<WalletPageRoute component={TxHistoryPage} />} />
          <Route
            path={routes.__dev}
            element={
              <DeveloperRoute feature="devPage">
                <Suspense fallback={<Loading />}>
                  <WalletPageRoute component={DevPage} />
                </Suspense>
              </DeveloperRoute>
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={routes.login} replace />} />
    </Route>,
  ),
)

function App() {
  const walletFileName = useStore(authStore, (state) => state.state?.walletFileName)

  return (
    <ThemeProvider defaultTheme="dark" enableSystem>
      <JamDisplayContextProvider>
        <QueryClientProvider client={queryClient}>
          <JamSessionInfoContextProvider>
            <JmWebsocketContextProvider>
              <RefreshApiToken />
              <RefreshJmSession />
              {walletFileName && <LoadFeeConfigData walletFileName={walletFileName} />}
              <RouterProvider router={router} />
              <Toaster closeButton />
            </JmWebsocketContextProvider>
          </JamSessionInfoContextProvider>
        </QueryClientProvider>
      </JamDisplayContextProvider>
    </ThemeProvider>
  )
}

function Loading() {
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
            const message = getErrorReason(response.error, 'Unknown error.')
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

function LoadFeeConfigData({ walletFileName }: { walletFileName: WalletFileName }) {
  const { t } = useTranslation()
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
        if (isDevMode) {
          console.table(values)
          toast.success(`[DEV] ${consoleInfo}`, {
            id: 'fee-values-success',
          })
        }
      })
      .catch((error) => {
        const reason = getErrorReason(error, t('global.errors.reason_unknown'))
        const errorMessage = t('settings.fees.error_loading_fee_config_failed', { reason })
        toast.error(errorMessage)
        console.error(errorMessage)
      })
  }, [fetchMissing, t])

  return <></>
}

const RELOAD_WALLET_INFO_DELAY: {
  AFTER_RESCAN: Milliseconds
  AFTER_UTXO_CHANGE: Milliseconds
  AFTER_BLOCK_HEIGHT_CHANGE: Milliseconds
  AFTER_TAKER_STOPPED: Milliseconds
  AFTER_TX_MESSAGE: Milliseconds
} = {
  // After rescanning, it is necessary to give the JM backend some time to synchronize.
  // A couple of seconds should be enough, however, this depends on the user hardware
  // and the delay might need to be increased if users encounter problems, e.g. the
  // balance changes again when switching views.
  // As reference: 4 seconds was not enough, even on regtest. But keep in mind, this only
  // takes effect after rescanning the chain, which should happen quite infrequently.
  AFTER_RESCAN: 8_000,

  // Small delay is sufficient after utxo change (e.g. normal unlock of wallet)
  AFTER_UTXO_CHANGE: 210,

  // Small delay is sufficient after block height change
  AFTER_BLOCK_HEIGHT_CHANGE: 210,

  // Small delay is sufficient after block height change
  AFTER_TAKER_STOPPED: 210,

  // Small delay is sufficient after an incoming tx message via websocket
  AFTER_TX_MESSAGE: 210,
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
export const WalletInfoAutoReload = () => {
  const {
    blockHeight: currentBlockHeight,
    takerInfo: { running: currentTakerRunning },
    rescanInfo: currentRescanInfo,
  } = useJamSessionInfoContext()
  const previousRescanningRef = useRef<boolean>(currentRescanInfo.rescanning)
  const previousBlockHeightRef = useRef<number | undefined>(currentBlockHeight)
  const previousTakerRunningRef = useRef<boolean>(currentTakerRunning)

  const jmTxs = useStore(jmTxStore, (state) => state.state)
  const previousJmTxsRef = useRef<JmTxInfos>(jmTxs)

  const { refetch: refetchWalletBalance, utxosHashHex } = useJamWalletInfoContext()

  const previousUtxosHashHexRef = useRef(utxosHashHex)

  useEffect(
    function refetchWalletInfoAfterRescanFinished() {
      const wasRescanning = previousRescanningRef.current
      const isRescanning = currentRescanInfo.rescanning
      previousRescanningRef.current = isRescanning

      const rescanFinished = wasRescanning === true && isRescanning === false
      if (!rescanFinished) {
        console.debug('Abort refetching: Rescan did not finish yet.')
        return
      }

      const delayBefore: Milliseconds = RELOAD_WALLET_INFO_DELAY.AFTER_RESCAN
      console.debug('Trigger refetch looking for funds AFTER_RESCAN with delay %d...', delayBefore)

      const abortCtrl = new AbortController()
      refetchWalletBalance({ delayBefore, signal: abortCtrl.signal }).catch((error: unknown) => {
        console.warn('Error while auto-reloading wallet info AFTER_RESCAN finished', error)
      })
      return () => abortCtrl.abort('useEffect(AFTER_RESCAN) ended')
    },
    [refetchWalletBalance, currentRescanInfo.rescanning],
  )

  useEffect(
    function refetchWalletInfoAfterBlockHeightIncrease() {
      if (currentBlockHeight === undefined) return

      const blockHeightChanged =
        previousBlockHeightRef.current !== undefined && previousBlockHeightRef.current !== currentBlockHeight
      previousBlockHeightRef.current = currentBlockHeight

      if (!blockHeightChanged) {
        console.debug('Abort refetching: Block height did not change.')
        return
      }

      const delayBefore = RELOAD_WALLET_INFO_DELAY.AFTER_BLOCK_HEIGHT_CHANGE
      console.debug('Trigger refetch looking for funds AFTER_BLOCK_HEIGHT_CHANGE with delay %d...', delayBefore)

      const abortCtrl = new AbortController()
      refetchWalletBalance({ delayBefore, signal: abortCtrl.signal }).catch((error: unknown) => {
        console.warn('Error while auto-reloading wallet info AFTER_BLOCK_HEIGHT_CHANGE finished', error)
      })
      return () => abortCtrl.abort('useEffect(AFTER_BLOCK_HEIGHT_CHANGE) ended')
    },
    [refetchWalletBalance, currentBlockHeight],
  )

  useEffect(
    function refetchWalletInfoAfterUtxoChange() {
      if (previousUtxosHashHexRef.current === utxosHashHex) {
        return
      }

      previousUtxosHashHexRef.current = utxosHashHex

      const delayBefore = RELOAD_WALLET_INFO_DELAY.AFTER_UTXO_CHANGE
      console.debug(
        'Trigger refetch looking for funds AFTER_UTXO_CHANGE (%s) with delay %d...',
        utxosHashHex,
        delayBefore,
      )

      const abortCtrl = new AbortController()
      refetchWalletBalance({ delayBefore, signal: abortCtrl.signal }).catch((error: unknown) => {
        console.error('Error while auto-reloading wallet info AFTER_UTXO_CHANGE finished', error)
      })
      return () => abortCtrl.abort('useEffect(AFTER_UTXO_CHANGE) ended')
    },
    [refetchWalletBalance, utxosHashHex],
  )

  useEffect(
    function refetchWalletInfoAfterTxMessage() {
      const txsChanged = previousJmTxsRef.current !== jmTxs
      previousJmTxsRef.current = jmTxs
      if (!txsChanged) {
        return
      }

      const delayBefore = RELOAD_WALLET_INFO_DELAY.AFTER_TX_MESSAGE
      console.debug('Trigger refetch looking for funds AFTER_TX_MESSAGE with delay %d...', delayBefore)

      const abortCtrl = new AbortController()
      refetchWalletBalance({ delayBefore, signal: abortCtrl.signal }).catch((error: unknown) => {
        console.warn('Error while auto-reloading wallet info AFTER_TX_MESSAGE finished', error)
      })
      return () => abortCtrl.abort('useEffect(AFTER_TX_MESSAGE) ended')
    },
    [refetchWalletBalance, jmTxs],
  )

  useEffect(
    function refetchWalletInfoAfterTakerStopped() {
      const takerStopped = previousTakerRunningRef.current === true && currentTakerRunning === false
      previousTakerRunningRef.current = currentTakerRunning
      if (!takerStopped) {
        return
      }

      const delayBefore = RELOAD_WALLET_INFO_DELAY.AFTER_TAKER_STOPPED
      console.debug('Trigger refetch looking for funds AFTER_TAKER_STOPPED with delay %d...', delayBefore)

      const abortCtrl = new AbortController()
      refetchWalletBalance({ delayBefore, signal: abortCtrl.signal }).catch((error: unknown) => {
        console.error('Error while auto-reloading wallet info AFTER_TAKER_STOPPED finished', error)
      })
      return () => abortCtrl.abort('useEffect(AFTER_TAKER_STOPPED) ended')
    },
    [refetchWalletBalance, currentTakerRunning],
  )

  return <></>
}

export default App
