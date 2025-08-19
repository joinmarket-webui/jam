import { useEffect, useMemo } from 'react'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import CreateWallet from '@/components/CreateWallet'
import JamLanding from '@/components/JamLanding'
import LoginPage from '@/components/Login'
import SwitchWallet from '@/components/SwitchWallet'
import { Layout } from '@/components/layout/Layout'
import { Toaster } from '@/components/ui/sonner'
import { useApiClient } from '@/hooks/useApiClient'
import { token } from '@/lib/jm-api/generated/client'
import { queryClient } from '@/lib/queryClient'
import { setIntervalDebounced } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { Logs } from './components/Logs'
import { Orderbook } from './components/Orderbook'
import { EarnPage } from './components/earn/EarnPage'
import { Receive } from './components/receive/Receive'
import { RescanChain } from './components/settings/RescanChain'
import { Settings } from './components/settings/Settings'
import { SweepPage } from './components/sweep/SweepPage'
import { JAM_API_AUTH_TOKEN_RENEW_INTERVAL, JAM_JM_SESSION_REFRESH_INTERVAL } from './constants/jam'
import { sessionOptions } from './lib/jm-api/generated/client/@tanstack/react-query.gen'
import { jmSessionStore } from './store/jmSessionStore'

const ProtectedRoute = ({ children, authenticated }: { children: React.ReactNode; authenticated: boolean }) => {
  return authenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  const authState = useStore(authStore, (state) => state.state)
  const authenticated = useMemo(() => authState?.auth?.token !== undefined, [authState])
  const walletFileName = useMemo(() => authState?.walletFileName || '', [authState])

  return (
    <ThemeProvider defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <RefreshApiToken />
        <RefreshJmSession />
        <Router>
          <Routes>
            <Route path="/login" element={authenticated ? <Navigate to="/" replace /> : <LoginPage />} />
            <Route path="/create-wallet" element={authenticated ? <Navigate to="/" replace /> : <CreateWallet />} />
            <Route
              path="/switch-wallet"
              element={
                authenticated ? <SwitchWallet walletFileName={walletFileName} /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute authenticated={authenticated}>
                  <Layout>
                    <JamLanding />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/receive"
              element={
                <ProtectedRoute authenticated={authenticated}>
                  <Layout>
                    <Receive walletFileName={walletFileName} />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/rescan"
              element={
                <ProtectedRoute authenticated={authenticated}>
                  <Layout>
                    <RescanChain walletFileName={walletFileName} />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/earn"
              element={
                <ProtectedRoute authenticated={authenticated}>
                  <Layout>
                    <EarnPage walletFileName={walletFileName} />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sweep"
              element={
                <ProtectedRoute authenticated={authenticated}>
                  <Layout>
                    <SweepPage walletFileName={walletFileName} />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute authenticated={authenticated}>
                  <Layout>
                    <Settings walletFileName={walletFileName} />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orderbook"
              element={
                <ProtectedRoute authenticated={authenticated}>
                  <Layout>
                    <Orderbook />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/logs"
              element={
                <ProtectedRoute authenticated={authenticated}>
                  <Layout>
                    <Logs />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <Toaster closeButton />
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

function RefreshApiToken() {
  const client = useApiClient()

  // TODO: stop this interval if no wallet is active
  useEffect(() => {
    if (import.meta.env.DEV) {
      toast.info(`[DEV] setup refresh interval`)
    }

    let intervalId: NodeJS.Timeout
    setIntervalDebounced(
      async () => {
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

          if (import.meta.env.DEV) {
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

          if (import.meta.env.DEV) {
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

  const sessionQuery = useQuery({
    ...sessionOptions({ client }),
    refetchInterval: JAM_JM_SESSION_REFRESH_INTERVAL,
    refetchIntervalInBackground: true,
  })

  useEffect(() => {
    if (sessionQuery.data) {
      jmSessionStore.getState().update(sessionQuery.data)

      if (import.meta.env.DEV) {
        toast.info(`[DEV] Successfully refreshed session data.`, {
          id: 'jm-session-refresh-success',
        })
      }
    }
  }, [sessionQuery.data])

  useEffect(() => {
    if (authState === undefined) {
      sessionQuery.refetch().catch(() => {
        if (import.meta.env.DEV) {
          toast.error(`[DEV] Error while refreshing session data.`)
        }
      })
    }
  }, [authState, sessionQuery])

  return <></>
}

export default App
