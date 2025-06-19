import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import JamLanding from './components/JamLanding'
import LoginPage from './components/Login'
import CreateWallet from './components/CreateWallet'
import { Layout } from './components/layout/Layout'
import { clearSession, getSession, setSession } from './lib/session'
import { Toaster } from './components/ui/sonner'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { useApiClient } from './hooks/useApiClient'
import { useEffect } from 'react'
import { JM_API_AUTH_TOKEN_EXPIRY } from './constants/jm'
import { setIntervalDebounced } from './lib/utils'
import { toast } from 'sonner'
import { token } from './lib/jm-api/generated/client'

// Check if user is authenticated
const isAuthenticated = () => {
  const session = getSession()
  return session !== null
}

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <RefreshApiToken />
        <Router>
          <Routes>
            <Route path="/login" element={isAuthenticated() ? <Navigate to="/" replace /> : <LoginPage />} />
            <Route path="/create-wallet" element={isAuthenticated() ? <Navigate to="/" replace /> : <CreateWallet />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <JamLanding />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <Toaster />
        </Router>
      </QueryClientProvider>
    </>
  )
}

const API_AUTH_TOKEN_RENEW_INTERVAL = Math.round(JM_API_AUTH_TOKEN_EXPIRY * 0.75)

function RefreshApiToken() {
  const client = useApiClient()

  // TODO: stop this interval if no wallet if active
  useEffect(() => {
    if (import.meta.env.DEV) {
      toast.info(`[DEV] setup refresh interval`)
    }

    let intervalId: NodeJS.Timeout
    setIntervalDebounced(
      async () => {
        const session = getSession()
        if (session?.auth?.refresh_token === undefined) return

        const response = await token({
          client,
          body: {
            grant_type: 'refresh_token',
            refresh_token: session.auth.refresh_token,
          },
        })

        if (!response.data) {
          clearSession()

          if (import.meta.env.DEV) {
            const message = response.error?.message || response.error?.error_description || 'Unknown error.'
            toast.error(`[DEV] Error while refreshing auth token: ${message}`)
          }
        } else {
          setSession({
            auth: {
              token: response.data.token,
              refresh_token: response.data.refresh_token,
            },
          })

          if (import.meta.env.DEV) {
            toast.info(`[DEV] Successfully refreshed auth token.`)
          }
        }
      },
      API_AUTH_TOKEN_RENEW_INTERVAL,
      (timerId) => (intervalId = timerId),
    )

    return () => {
      clearInterval(intervalId)
    }
  }, [client])

  return <></>
}

export default App
