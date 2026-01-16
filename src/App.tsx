import { lazy, Suspense, useEffect, useMemo } from 'react'
import type { PropsWithChildren } from 'react'
import { lockwalletOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { token } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import type { TFunction } from 'i18next'
import { Loader2Icon } from 'lucide-react'
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
import CreateWalletPage from '@/components/CreateWalletPage'
import LoginPage from '@/components/LoginPage'
import { LogsPage } from '@/components/LogsPage'
import MainWalletPage from '@/components/MainWalletPage'
import SwitchWalletPage from '@/components/SwitchWalletPage'
import { EarnPage } from '@/components/earn/EarnPage'
import ErrorPage from '@/components/error/ErrorPage'
import { Layout } from '@/components/layout/Layout'
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
import { WalletJarsDetailsPage } from './components/wallet/WalletJarsDetailsPage'

const DevSetupPage = lazy(() => import('@/components/dev/DevSetupPage'))
const DevPage = lazy(() => import('@/components/dev/DevPage'))
const DevErrorThrowingComponent = lazy(() => import('@/components/dev/DevErrorThrowingComponent'))

const ProtectedRoute = ({ authenticated, children }: PropsWithChildren<{ authenticated: boolean }>) => {
  return authenticated ? <>{children}</> : <Navigate to={routes.login} replace />
}

function App() {
  const walletFileName = useStore(authStore, (state) => state.state?.walletFileName)
  const hasAuthToken = useStore(authStore, (state) => state.state?.auth?.token !== undefined)
  const authenticated = useMemo(() => walletFileName !== undefined && hasAuthToken, [walletFileName, hasAuthToken])
  const { clear: clearAuth } = useStore(authStore, (state) => state)
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

  const doOnLogout = async (navigate: NavigateFunction) => {
    clearAuth()
    queryClient.clear()
    await navigate(routes.login)
  }

  const doOnLockWallet = async (navigate: NavigateFunction, t: TFunction<'translation', undefined>) => {
    if (!walletFileName) return
    try {
      await lockWalletQuery.refetch()
      toast.success(
        t('wallets.wallet_preview.alert_wallet_locked_successfully', { walletName: walletDisplayName(walletFileName) }),
      )
      await doOnLogout(navigate)
    } catch (error: unknown) {
      const errorMessage = (error instanceof Error ? (error.message ?? '') : '') || t('global.errors.reason_unknown')
      toast.error(t('global.errors.error_reloading_wallet_failed', { reason: errorMessage }))
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
        {isDebugFeatureEnabled('devSetupPage') && (
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
        {isDebugFeatureEnabled('devErrorExamplePage') && (
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
              <JamWalletInfoContextProvider walletFileName={walletFileName!}>
                <Outlet />
              </JamWalletInfoContextProvider>
            </ProtectedRoute>
          }
        >
          <Route id="without-navbar" element={<Outlet />}>
            <Route path={routes.switchWallet} element={<SwitchWalletPage walletFileName={walletFileName!} />} />
          </Route>
          <Route
            id="with-navbar"
            element={
              <Layout onLogout={doOnLogout} onLockWallet={doOnLockWallet}>
                <Outlet />
              </Layout>
            }
          >
            <Route path={routes.home} element={<MainWalletPage walletFileName={walletFileName!} />} />
            <Route path={routes.receive} element={<ReceivePage walletFileName={walletFileName!} />} />
            <Route path={routes.send} element={<SendPage walletFileName={walletFileName!} />} />
            <Route path={routes.earn} element={<EarnPage walletFileName={walletFileName!} />} />
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
            {isDebugFeatureEnabled('devPage') && (
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
          {walletFileName && <LoadFeeConfigData walletFileName={walletFileName} />}
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
      <Loader2Icon className="h-4 w-4 animate-spin motion-reduce:hidden" />
      {t('global.loading')}
    </div>
  )
}

function RefreshApiToken() {
  const client = useApiClient()

  // TODO: stop this interval if no wallet is active
  useEffect(() => {
    const isDevMode = jamSettingsStore.getState().state.developerMode
    if (isDevMode) {
      toast.info(`[DEV] setup refresh interval`)
    }

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
          authStore.getState().clear()

          if (isDevMode) {
            const message = response.error?.message || response.error?.error_description || 'Unknown error.'
            toast.error(`[DEV] Error while renewing auth token: ${message}`)
          }
        } else {
          authStore.getState().update({
            auth: {
              token: response.data.token,
              refresh_token: response.data.refresh_token,
            },
          })

          if (isDevMode) {
            toast.info(`[DEV] Successfully renewed auth token.`, {
              id: 'token-renew-success',
            })
          }
        }
      },
      JAM_API_AUTH_TOKEN_RENEW_INTERVAL,
      (timerId) => (intervalId = timerId),
    )

    return () => {
      clearInterval(intervalId)
    }
  }, [client])

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
      .catch((e) => {
        const consoleError = 'Error while loading fee values.'
        console.error(consoleError, e)
        if (isDevMode) {
          toast.error(`[DEV] ${consoleError}`)
        }
      })
  }, [fetchMissing])

  return <></>
}

export default App
