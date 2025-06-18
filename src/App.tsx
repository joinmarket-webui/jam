import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import JamLanding from './components/JamLanding'
import LoginPage from './components/Login'
import CreateWallet from './components/CreateWallet'
import { Layout } from './components/layout/Layout'
import { clearSession, getSession, setSession } from './lib/session'
import { Toaster } from './components/ui/sonner'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { useApiClient } from './hooks/useApiClient'
import { tokenOptions } from './lib/jm-api/generated/client/@tanstack/react-query.gen'
import { useEffect } from 'react'

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

function RefreshApiToken() {
  const client = useApiClient()

  const tokenQuery = useQuery({
    ...tokenOptions({ client }),
    refetchIntervalInBackground: true,
    refetchInterval: 60_000,
    retry: false,
  })

  useEffect(() => {
    if (tokenQuery.error) {
      clearSession()
    } else if (tokenQuery.data) {
      setSession({
        auth: {
          token: tokenQuery.data.token,
          refresh_token: tokenQuery.data.refresh_token,
        },
      })
    }
  }, [tokenQuery.data, tokenQuery.error])

  return <></>
}

export default App
