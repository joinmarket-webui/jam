import { useEffect, useMemo } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { toast } from 'sonner'
import CreateWallet from '@/components/CreateWallet'
import JamLanding from '@/components/JamLanding'
import LoginPage from '@/components/Login'
import { Layout } from '@/components/layout/Layout'
import { Toaster } from '@/components/ui/sonner'
import { JM_API_AUTH_TOKEN_EXPIRY } from '@/constants/jm'
import { useApiClient } from '@/hooks/useApiClient'
import { useSession } from '@/hooks/useSession'
import { token } from '@/lib/jm-api/generated/client'
import { queryClient } from '@/lib/queryClient'
import { clearSession, getSession, setSession } from '@/lib/session'
import { setIntervalDebounced } from '@/lib/utils'
import { Receive } from './components/receive/Receive'

const ProtectedRoute = ({ children, authenticated }: { children: React.ReactNode; authenticated: boolean }) => {
  return authenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  const session = useSession()
  const authenticated = useMemo(() => session?.auth?.token !== undefined, [session])
  const walletFileName = useMemo(() => session?.walletFileName || '', [session])

  return (
    <ThemeProvider defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <RefreshApiToken />
        <Router>
          <Routes>
            <Route path="/login" element={authenticated ? <Navigate to="/" replace /> : <LoginPage />} />
            <Route path="/create-wallet" element={authenticated ? <Navigate to="/" replace /> : <CreateWallet />} />
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
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <Toaster closeButton />
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

const API_AUTH_TOKEN_RENEW_INTERVAL = Math.round(JM_API_AUTH_TOKEN_EXPIRY * 0.75)

function RefreshApiToken() {
  const client = useApiClient()
  const session = useSession()

  useEffect(() => {
    if (!session?.walletFileName && session?.auth) {
      if (import.meta.env.DEV) {
        console.log(`[DEV] No active wallet, clearing authentication tokens`)
      }
      clearSession()
      return
    }
  }, [session?.walletFileName, session?.auth])

  // Set up token refresh interval only when wallet is active
  useEffect(() => {
    if (!session?.walletFileName || !session?.auth?.refresh_token) {
      return
    }

    if (import.meta.env.DEV) {
      toast.info(`[DEV] setup refresh interval`)
    }

    let intervalId: NodeJS.Timeout
    setIntervalDebounced(
      async () => {
        const currentSession = getSession()
        if (!currentSession?.auth?.refresh_token) {
          return
        }

        const response = await token({
          client,
          body: {
            grant_type: 'refresh_token',
            refresh_token: currentSession.auth.refresh_token,
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
  }, [client, session?.walletFileName, session?.auth?.refresh_token])

  return <></>
}

export default App
