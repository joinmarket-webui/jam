import { lazy, Suspense, useEffect, useMemo } from 'react'
import type { PropsWithChildren } from 'react'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { ThemeProvider } from 'next-themes'
import { useTranslation } from 'react-i18next'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import CreateWallet from '@/components/CreateWallet'
import JamLanding from '@/components/JamLanding'
import LoginPage from '@/components/Login'
import { Logs } from '@/components/Logs'
import { Orderbook } from '@/components/Orderbook'
import SwitchWallet from '@/components/SwitchWallet'
import { EarnPage } from '@/components/earn/EarnPage'
import { Layout } from '@/components/layout/Layout'
import { Receive } from '@/components/receive/Receive'
import { SendPage } from '@/components/send/SendPage'
import { RescanChain } from '@/components/settings/RescanChain'
import { SettingsPage } from '@/components/settings/Settings'
import { SweepPage } from '@/components/sweep/SweepPage'
import { Toaster } from '@/components/ui/sonner'
import { JAM_API_AUTH_TOKEN_RENEW_INTERVAL, JAM_JM_SESSION_REFRESH_INTERVAL } from '@/constants/jam'
import { routes } from '@/constants/routes'
import { useApiClient } from '@/hooks/useApiClient'
import { token } from '@/lib/jm-api/generated/client'
import { sessionOptions } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import { queryClient } from '@/lib/queryClient'
import { setIntervalDebounced } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { isDebugFeatureEnabled } from './constants/debugFeatures'
import { jamSettingsStore } from './store/jamSettingsStore'

const DevSetupPage = lazy(() => import('@/components/dev/DevSetupPage'))
const DevPage = lazy(() => import('@/components/dev/DevPage'))

const ProtectedRoute = ({ authenticated, children }: PropsWithChildren<{ authenticated: boolean }>) => {
  return authenticated ? <>{children}</> : <Navigate to={routes.login} replace />
}

function App() {
  const authState = useStore(authStore, (state) => state.state)
  const walletFileName = useMemo(() => authState?.walletFileName, [authState])
  const authenticated = useMemo(
    () => walletFileName !== undefined && authState?.auth?.token !== undefined,
    [authState, walletFileName],
  )

  return (
    <ThemeProvider defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <RefreshApiToken />
        <RefreshJmSession />
        <Router>
          <Routes>
            <Route
              path={routes.login}
              element={authenticated ? <Navigate to={routes.home} replace /> : <LoginPage />}
            />
            <Route
              path={routes.createWallet}
              element={authenticated ? <Navigate to={routes.home} replace /> : <CreateWallet />}
            />
            <Route
              path={routes.switchWallet}
              element={
                <ProtectedRoute authenticated={authenticated}>
                  <SwitchWallet walletFileName={walletFileName!} />
                </ProtectedRoute>
              }
            />
            <Route
              path={routes.home}
              element={
                <ProtectedRoute authenticated={authenticated}>
                  <Layout>
                    <JamLanding />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path={routes.receive}
              element={
                <ProtectedRoute authenticated={authenticated}>
                  <Layout>
                    <Receive walletFileName={walletFileName!} />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path={routes.send}
              element={
                <ProtectedRoute authenticated={authenticated}>
                  <Layout>
                    <SendPage walletFileName={walletFileName!} />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path={routes.earn}
              element={
                <ProtectedRoute authenticated={authenticated}>
                  <Layout>
                    <EarnPage walletFileName={walletFileName!} />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path={routes.sweep}
              element={
                <ProtectedRoute authenticated={authenticated}>
                  <Layout>
                    <SweepPage walletFileName={walletFileName!} />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path={routes.settings}
              element={
                <ProtectedRoute authenticated={authenticated}>
                  <Layout>
                    <SettingsPage walletFileName={walletFileName!} />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path={routes.orderbook}
              element={
                <ProtectedRoute authenticated={authenticated}>
                  <Layout>
                    <Orderbook />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path={routes.logs}
              element={
                <ProtectedRoute authenticated={authenticated}>
                  <Layout>
                    <Logs />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path={routes.rescan}
              element={
                <ProtectedRoute authenticated={authenticated}>
                  <Layout>
                    <RescanChain walletFileName={walletFileName!} />
                  </Layout>
                </ProtectedRoute>
              }
            />
            {isDebugFeatureEnabled('devPage') && (
              <Route
                id="dev-page"
                path={routes.__dev}
                element={
                  <Layout>
                    <Suspense fallback={<Loading />}>
                      <DevPage walletFileName={walletFileName} />
                    </Suspense>
                  </Layout>
                }
              />
            )}
            {isDebugFeatureEnabled('devSetupPage') && (
              <Route
                id="dev-setup"
                path={routes.__devSetup}
                element={
                  <Layout>
                    <Suspense fallback={<Loading />}>
                      <DevSetupPage />
                    </Suspense>
                  </Layout>
                }
              />
            )}
            <Route path="*" element={<Navigate to={routes.login} replace />} />
          </Routes>
          <Toaster closeButton />
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

const Loading = () => {
  const { t } = useTranslation()
  return (
    <div className="m-2 flex items-center justify-center">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
  const client = useApiClient()
  const authState = useStore(authStore, (state) => state.state)

  const { data: sessionData, refetch: refetchSessionData } = useQuery({
    ...sessionOptions({ client }),
    retry: 3,
    staleTime: 0,
    refetchInterval: JAM_JM_SESSION_REFRESH_INTERVAL,
    refetchIntervalInBackground: true,
  })

  useEffect(() => {
    if (sessionData) {
      jmSessionStore.getState().update(sessionData)

      const isDevMode = jamSettingsStore.getState().state.developerMode
      if (isDevMode) {
        toast.info(`[DEV] Successfully refreshed session data.`, {
          id: 'jm-session-refresh-success',
        })
      }
    }
  }, [sessionData])

  useEffect(
    function refetchOnWalletLockOrUnlock() {
      refetchSessionData().catch(() => {
        const isDevMode = jamSettingsStore.getState().state.developerMode
        if (isDevMode) {
          toast.error(`[DEV] Error while refreshing session data.`)
        }
      })
    },
    [authState?.walletFileName, refetchSessionData],
  )

  return <></>
}

export default App
