import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { lockwalletOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { token } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
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
import { queryClient } from '@/lib/queryClient'
import { setIntervalDebounced, walletDisplayName, type WalletFileName } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { EarnReportPage } from './components/earn/report/EarnReportPage'
import { LockWalletConfirmDialog } from './components/ui/jam/LockWalletConfirmDialog'
import { Spinner } from './components/ui/spinner'
import { WalletJarsDetailsPage } from './components/wallet/WalletJarsDetailsPage'
import { JamSessionInfoContextProvider } from './context/JamSessionInfoContextProvider'
import { useJmWebsocket } from './hooks/useJmWebsocket'
import { jmSessionStore } from './store/jmSessionStore'
import { jmTxStore, type JmTxInfo } from './store/jmTxStore'

const DevSetupPage = lazy(() => import('@/components/dev/DevSetupPage'))
const DevPage = lazy(() => import('@/components/dev/DevPage'))
const DevErrorThrowingComponent = lazy(() => import('@/components/dev/DevErrorThrowingComponent'))

const clearAuthAndQueryCache = () => {
  authStore.getState().clear()
  queryClient.clear()
}

const ProtectedRoute = ({ authenticated, children }: PropsWithChildren<{ authenticated: boolean }>) => {
  return authenticated ? <>{children}</> : <Navigate to={routes.login} replace />
}

type LockWalletDialogContext = {
  open: true // always true - otherwise object is `undefined`
  navigate: NavigateFunction
  t: TFunction<'translation', undefined>
}

function App() {
  const walletFileName = useStore(authStore, (state) => state.state?.walletFileName)
  const hasAuthToken = useStore(authStore, (state) => state.state?.auth?.token !== undefined)
  const isDeveloperMode = useStore(jamSettingsStore, (state) => state.state.developerMode)
  const authenticated = useMemo(() => walletFileName !== undefined && hasAuthToken, [walletFileName, hasAuthToken])

  const jmSession = useStore(jmSessionStore, (state) => state.state)

  const makerRunning = jmSession?.maker_running === true
  const coinjoinInProgress = jmSession?.coinjoin_in_process === true || (jmSession?.schedule?.length || 0) > 0

  const client = useApiClient()

  const lockWalletQuery = useQuery(
    {
      ...lockwalletOptions({
        client,
        path: { walletname: encodeURIComponent(walletFileName || '') },
      }),
      staleTime: 1,
      gcTime: 1,
      enabled: false,
    },
    queryClient,
  )
  const [lockWalletDialogContext, setLockWalletDialogContext] = useState<LockWalletDialogContext>()

  const doOnLogout = async (navigate: NavigateFunction) => {
    clearAuthAndQueryCache()
    await navigate(routes.login)
  }

  const doOnLockWallet = async (navigate: NavigateFunction, t: TFunction<'translation', undefined>) => {
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
  }

  const doOnLockWalletConfirm = async (navigate: NavigateFunction, t: TFunction<'translation', undefined>) => {
    if (!walletFileName) return
    try {
      await lockWalletQuery.refetch({ throwOnError: true })
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

  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route id="base" element={<Outlet />} errorElement={<ErrorPage />}>
        <Route path={routes.login} element={authenticated ? <Navigate to={routes.home} replace /> : <LoginPage />} />
        <Route
          path={routes.createWallet}
          element={authenticated ? <Navigate to={routes.home} replace /> : <CreateWalletPage />}
        />
        <Route
          path={routes.importWallet}
          element={authenticated ? <Navigate to={routes.home} replace /> : <ImportWalletPage />}
        />
        {isDeveloperMode && isDebugFeatureEnabled('devSetupPage') && (
          <Route
            id="dev-setup"
            path={routes.__devSetup}
            element={
              <Suspense fallback={<Loading />}>
                <DevSetupPage />
              </Suspense>
            }
          />
        )}
        {isDeveloperMode && isDebugFeatureEnabled('devErrorExamplePage') && (
          <Route
            id="error-example"
            path={routes.__devErrorExample}
            element={
              <Suspense fallback={<Loading />}>
                <DevErrorThrowingComponent />
              </Suspense>
            }
          />
        )}
        <Route
          id="protected"
          element={
            <ProtectedRoute authenticated={authenticated}>
              <JamSessionInfoContextProvider walletFileName={walletFileName!}>
                <JamWalletInfoContextProvider walletFileName={walletFileName!}>
                  <Outlet />
                </JamWalletInfoContextProvider>
              </JamSessionInfoContextProvider>
            </ProtectedRoute>
          }
        >
          <Route id="protected-without-navbar" element={<Outlet />}>
            <Route path={routes.switchWallet} element={<SwitchWalletPage walletFileName={walletFileName!} />} />
          </Route>
          <Route
            id="protected-with-navbar"
            element={
              <Layout onLogout={doOnLogout} onLockWallet={doOnLockWallet} walletFileName={walletFileName!}>
                <Outlet />
              </Layout>
            }
          >
            <Route path={routes.home} element={<MainWalletPage walletFileName={walletFileName!} />} />
            <Route path={routes.receive} element={<ReceivePage walletFileName={walletFileName!} />} />
            <Route path={routes.send} element={<SendPage walletFileName={walletFileName!} />} />
            <Route path={routes.earn} element={<EarnPage walletFileName={walletFileName!} />} />
            <Route path={routes.earnReport} element={<EarnReportPage walletFileName={walletFileName!} />} />
            <Route path={routes.sweep} element={<SweepPage walletFileName={walletFileName!} />} />
            <Route
              path={routes.settings}
              element={<SettingsPage walletFileName={walletFileName!} onLockWallet={doOnLockWallet} />}
            />
            <Route path={routes.orderbook} element={<OrderbookPage />} />
            <Route path={routes.logs} element={<LogsPage />} />
            <Route path={routes.rescan} element={<RescanChainPage walletFileName={walletFileName!} />} />
            <Route
              path={routes.walletJarsDetails}
              element={<WalletJarsDetailsPage walletFileName={walletFileName!} />}
            />
            {isDeveloperMode && isDebugFeatureEnabled('devPage') && (
              <Route
                id="dev-page"
                path={routes.__dev}
                element={
                  <Suspense fallback={<Loading />}>
                    <DevPage walletFileName={walletFileName} />
                  </Suspense>
                }
              />
            )}
          </Route>
        </Route>
        <Route path="*" element={<Navigate to={routes.login} replace />} />
      </Route>,
    ),
  )
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
              open={lockWalletDialogContext?.open}
              onOpenChange={() => setLockWalletDialogContext(undefined)}
              onConfirm={() => doOnLockWalletConfirm(lockWalletDialogContext?.navigate, lockWalletDialogContext?.t)}
              isLocking={lockWalletQuery.isFetching}
              makerRunning={makerRunning}
              coinjoinInProgress={coinjoinInProgress}
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

export default App
