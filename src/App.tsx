import { lazy, Suspense, useEffect, useMemo } from 'react'
import type { PropsWithChildren } from 'react'
import { token } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { QueryClientProvider } from '@tanstack/react-query'
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
import { setIntervalDebounced, type WalletFileName } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { jamSettingsStore } from '@/store/jamSettingsStore'

const DevSetupPage = lazy(() => import('@/components/dev/DevSetupPage'))
const DevPage = lazy(() => import('@/components/dev/DevPage'))

const ProtectedRoute = ({ authenticated, children }: PropsWithChildren<{ authenticated: boolean }>) => {
  return authenticated ? <>{children}</> : <Navigate to={routes.login} replace />
}

function App() {
  const walletFileName = useStore(authStore, (state) => state.state?.walletFileName)
  const hasAuthToken = useStore(authStore, (state) => state.state?.auth?.token !== undefined)
  const authenticated = useMemo(() => walletFileName !== undefined && hasAuthToken, [walletFileName, hasAuthToken])

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
          <Route id="error-example" path={routes.__devErrorExample} element={<ErrorThrowingComponent />} />
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
              <Layout>
                <Outlet />
              </Layout>
            }
          >
            <Route path={routes.home} element={<MainWalletPage walletFileName={walletFileName!} />} />
            <Route path={routes.receive} element={<ReceivePage walletFileName={walletFileName!} />} />
            <Route path={routes.send} element={<SendPage walletFileName={walletFileName!} />} />
            <Route path={routes.earn} element={<EarnPage walletFileName={walletFileName!} />} />
            <Route path={routes.sweep} element={<SweepPage walletFileName={walletFileName!} />} />
            <Route path={routes.settings} element={<SettingsPage walletFileName={walletFileName!} />} />
            <Route path={routes.orderbook} element={<OrderbookPage />} />
            <Route path={routes.logs} element={<LogsPage />} />
            <Route path={routes.rescan} element={<RescanChainPage walletFileName={walletFileName!} />} />
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

const ErrorThrowingComponent = () => {
  useEffect(() => {
    throw new Error('This error is thrown on purpose. Only to be used for testing.')
  }, [])
  return <></>
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
